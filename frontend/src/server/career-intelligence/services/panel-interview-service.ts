import { prisma } from "../../core/db/prisma";
import { agentEventBus } from "../../core/events/agent-event-bus";
import { ttsAdapter } from "../../core/voice/adapters/tts-adapter";
import { voiceInterviewAgent } from "../agents/voice-interview-agent";
import { updateDigitalTwin } from "../memory/digital-twin";
import { MNC_PANEL_ROSTER, MODERATOR_NAME, MODERATOR_VOICE } from "../panel/panel-personas";
import { buildModeratorReport, type PanelistEvaluation } from "../evaluators/panel-evaluation-evaluator";
import { getOpeningPanelMessage, runPanelTurnGraph } from "../workflows/panel-graph";
import { normalizePanelQuestion } from "@/lib/speech-sanitize";
import { completeSession } from "./interview-service";
import { computeInterviewRealismScore } from "./interview-realism";

const MAX_PANEL_TURNS = 8;

export async function startPanelInterview(
  userId: string,
  opts: { resumeId?: string; mode?: "voice" | "text" } = {}
) {
  const mode = opts.mode || "voice";
  const resume = opts.resumeId
    ? await prisma.resume.findFirst({ where: { id: opts.resumeId, userId } })
    : await prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });

  const targetRole = resume?.targetRole || "Software Engineer";
  const opening = getOpeningPanelMessage(targetRole);
  const moderatorMessage = normalizePanelQuestion(opening.moderator);
  const firstQuestion = normalizePanelQuestion(opening.firstQuestion);

  const interviewSession = await prisma.interviewSession.create({
    data: {
      userId,
      resumeId: resume?.id,
      type: "panel",
      status: "in_progress",
      targetRole,
      metadata: { mode, maxTurns: MAX_PANEL_TURNS, interruptions: 0 } as object,
    },
  });

  const panelMembers = await Promise.all(
    MNC_PANEL_ROSTER.map((p) =>
      prisma.panelMember.create({
        data: {
          sessionId: interviewSession.id,
          persona: p.persona,
          name: p.name,
          role: p.role,
          voiceId: p.voiceId,
          personality: p.personality,
          expertise: p.expertise,
          questioningStyle: p.questioningStyle,
        },
      })
    )
  );

  const hrMember = panelMembers.find((m) => m.persona === "hr")!;

  const panelSession = await prisma.panelInterviewSession.create({
    data: {
      interviewSessionId: interviewSession.id,
      userId,
      mode,
      status: "active",
      currentSpeakerId: hrMember.id,
      maxTurns: MAX_PANEL_TURNS,
      metadata: { interruptions: 0 } as object,
    },
  });

  await prisma.interviewTurn.create({
    data: {
      sessionId: interviewSession.id,
      role: "ai",
      content: moderatorMessage,
      speakerId: null,
      analysis: { speaker: MODERATOR_NAME, kind: "welcome" } as object,
    },
  });

  await prisma.interviewTurn.create({
    data: {
      sessionId: interviewSession.id,
      role: "ai",
      content: firstQuestion,
      speakerId: hrMember.id,
      analysis: { speaker: opening.speaker.name, persona: opening.speaker.persona } as object,
    },
  });

  let tts = null;
  let moderatorTts = null;
  if (mode === "voice") {
    const spoken = await ttsAdapter.synthesize(firstQuestion, opening.speaker.voiceId);
    tts = {
      audioBase64: spoken.audioBase64,
      source: spoken.source,
      useBrowserFallback: spoken.source === "browser_fallback",
      voiceId: opening.speaker.voiceId,
      speaker: opening.speaker.name,
    };
    const modSpoken = await ttsAdapter.synthesize(moderatorMessage, MODERATOR_VOICE);
    moderatorTts = {
      audioBase64: modSpoken.audioBase64,
      source: modSpoken.source,
      useBrowserFallback: modSpoken.source === "browser_fallback",
      voiceId: MODERATOR_VOICE,
      speaker: MODERATOR_NAME,
    };
  }

  return {
    panelSessionId: panelSession.id,
    interviewSessionId: interviewSession.id,
    mode,
    targetRole,
    moderatorMessage,
    firstQuestion,
    activeSpeaker: { id: hrMember.id, name: opening.speaker.name, role: opening.speaker.role, voiceId: opening.speaker.voiceId },
    panel: panelMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      persona: m.persona,
      voiceId: m.voiceId,
      personality: m.personality,
    })),
    progress: { turnCount: 0, maxTurns: MAX_PANEL_TURNS },
    tts,
    moderatorTts,
    sttAvailable: mode === "voice" ? await import("../../core/voice/adapters/whisper-adapter").then((m) => m.whisperAdapter.isAvailable()) : false,
  };
}

export async function submitPanelAnswer(input: {
  panelSessionId: string;
  userId: string;
  answer: string;
}) {
  const panelSession = await prisma.panelInterviewSession.findFirst({
    where: { id: input.panelSessionId, userId: input.userId, status: "active" },
    include: {
      interviewSession: {
        include: {
          turns: { orderBy: { timestamp: "asc" } },
          panelMembers: true,
          resume: true,
        },
      },
    },
  });

  if (!panelSession) throw new Error("Active panel session not found");
  const session = panelSession.interviewSession;
  const meta = (session.metadata as Record<string, unknown>) || {};
  const interruptions = (meta.interruptions as number) || 0;

  const lastAiTurn = [...session.turns].reverse().find((t) => t.role === "ai");
  const lastQuestion = lastAiTurn?.content || "";

  await prisma.interviewTurn.create({
    data: { sessionId: session.id, role: "student", content: input.answer.trim() },
  });

  const recentTranscript = session.turns.map((t) => ({
    speaker: (t.analysis as { speaker?: string })?.speaker || (t.role === "student" ? "You" : "Panel"),
    text: t.content,
    role: t.role,
  }));
  recentTranscript.push({ speaker: "You", text: input.answer, role: "student" });

  const askedQuestions = session.turns.filter((t) => t.role === "ai").map((t) => t.content);

  const resumeData = session.resume?.data as { skills?: string[] } | undefined;
  const turnResult = await runPanelTurnGraph({
    sessionId: session.id,
    userId: input.userId,
    targetRole: session.targetRole || "Software Engineer",
    answer: input.answer,
    panel: session.panelMembers.map((m) => ({
      id: m.id,
      persona: m.persona,
      name: m.name,
      role: m.role,
      lastSpokeAt: m.lastSpokeAt,
      evaluation: m.evaluation as Record<string, unknown> | null,
    })),
    recentTranscript,
    askedQuestions,
    turnCount: panelSession.turnCount + 1,
    maxTurns: panelSession.maxTurns,
    lastQuestion,
    skills: resumeData?.skills,
  });

  const newTurnCount = panelSession.turnCount + 1;
  const isComplete = newTurnCount >= panelSession.maxTurns;
  const newInterruptions = interruptions + (turnResult.interrupted ? 1 : 0);

  const speakerMember = session.panelMembers.find((m) => m.id === turnResult.decision.nextSpeakerId)!;
  const nextQuestion = isComplete ? null : normalizePanelQuestion(turnResult.question);

  await prisma.panelMember.update({
    where: { id: speakerMember.id },
    data: {
      lastSpokeAt: new Date(),
      evaluation: turnResult.evaluation as object,
      hiringRecommendation: turnResult.evaluation.hiringRecommendation,
    },
  });

  if (!isComplete) {
    await prisma.interviewTurn.create({
      data: {
        sessionId: session.id,
        role: "ai",
        content: nextQuestion!,
        speakerId: speakerMember.id,
        analysis: {
          speaker: turnResult.speaker.name,
          persona: turnResult.speaker.persona,
          action: turnResult.decision.action,
          interrupted: turnResult.interrupted,
          moderatorReason: turnResult.decision.reason,
        } as object,
      },
    });
  }

  await prisma.interviewTurn.updateMany({
    where: { sessionId: session.id, role: "student", content: input.answer.trim() },
    data: { analysis: turnResult.answerAnalysis as object },
  });

  await prisma.panelInterviewSession.update({
    where: { id: panelSession.id },
    data: {
      turnCount: newTurnCount,
      currentSpeakerId: speakerMember.id,
      status: isComplete ? "completed" : "active",
      completedAt: isComplete ? new Date() : undefined,
      metadata: { interruptions: newInterruptions } as object,
    },
  });

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { metadata: { ...meta, interruptions: newInterruptions, mode: panelSession.mode } as object },
  });

  let tts = null;
  if (panelSession.mode === "voice" && !isComplete && nextQuestion) {
    const spoken = await ttsAdapter.synthesize(nextQuestion, turnResult.speaker.voiceId);
    tts = {
      audioBase64: spoken.audioBase64,
      source: spoken.source,
      useBrowserFallback: spoken.source === "browser_fallback",
      voiceId: turnResult.speaker.voiceId,
      speaker: turnResult.speaker.name,
    };
  }

  if (isComplete) {
    await finalizePanelInterview(panelSession.id, input.userId);
  }

  const aiQuestions = session.turns
    .filter((t) => t.role === "ai")
    .map((t) => t.content)
    .concat(nextQuestion ? [nextQuestion] : []);
  const realismScore = computeInterviewRealismScore({
    followUpCount: turnResult.decision.action === "follow_up" ? 1 : 0,
    interruptionCount: newInterruptions,
    turnCount: newTurnCount,
    recentQuestions: aiQuestions.slice(-6),
  });

  return {
    evaluation: turnResult.answerAnalysis,
    panelistFeedback: turnResult.evaluation,
    decision: turnResult.decision,
    interrupted: turnResult.interrupted,
    activeSpeaker: {
      id: speakerMember.id,
      name: turnResult.speaker.name,
      role: turnResult.speaker.role,
      voiceId: turnResult.speaker.voiceId,
    },
    nextQuestion,
    phase: isComplete ? "complete" : "your_turn",
    progress: { turnCount: newTurnCount, maxTurns: panelSession.maxTurns },
    tts,
    realism: {
      interruptions: newInterruptions,
      followUps: turnResult.decision.action === "follow_up" ? 1 : 0,
      contextReferences: turnResult.decision.action === "cross_question" ? 1 : 0,
      turnCount: newTurnCount,
    },
    realismScore,
  };
}

export async function processPanelVoiceTranscript(input: {
  panelSessionId: string;
  userId: string;
  transcript?: string;
  audioBase64?: string;
  audioDurationMs?: number;
}) {
  let transcript = input.transcript?.trim() || "";
  if (!transcript && input.audioBase64) {
    const stt = await voiceInterviewAgent.transcribeAudio(input.audioBase64);
    transcript = stt.text;
  }
  if (!transcript) throw new Error("Empty transcript — speak clearly or type your answer");

  return submitPanelAnswer({
    panelSessionId: input.panelSessionId,
    userId: input.userId,
    answer: transcript,
  });
}

export async function finalizePanelInterview(panelSessionId: string, userId: string) {
  const panelSession = await prisma.panelInterviewSession.findFirst({
    where: { id: panelSessionId, userId },
    include: {
      interviewSession: {
        include: { panelMembers: true, turns: { orderBy: { timestamp: "asc" } } },
      },
    },
  });
  if (!panelSession) throw new Error("Panel session not found");

  const evaluations: PanelistEvaluation[] = panelSession.interviewSession.panelMembers
    .filter((m) => m.evaluation)
    .map((m) => m.evaluation as unknown as PanelistEvaluation);

  const interruptions = ((panelSession.metadata as Record<string, number>)?.interruptions) || 0;
  const transcript = panelSession.interviewSession.turns.map((t) => ({
    speaker: (t.analysis as { speaker?: string })?.speaker || t.role,
    role: t.role,
  }));

  const moderatorReport = buildModeratorReport(evaluations, transcript, interruptions);

  await prisma.panelInterviewSession.update({
    where: { id: panelSessionId },
    data: { moderatorReport: moderatorReport as object, status: "completed", completedAt: new Date() },
  });

  await prisma.interviewSession.update({
    where: { id: panelSession.interviewSessionId },
    data: {
      report: moderatorReport as object,
      metadata: {
        ...(panelSession.interviewSession.metadata as object),
        panelReport: moderatorReport,
      } as object,
    },
  });

  await completeSession(panelSession.interviewSessionId, userId);

  await updateDigitalTwin(userId, {
    type: "panel",
    source: "panel.completed",
    data: {
      executiveCommunication: moderatorReport.executiveCommunication,
      stakeholderManagement: moderatorReport.stakeholderManagement,
      pressureHandling: moderatorReport.pressureHandling,
      panelReadiness: moderatorReport.panelReadiness,
      overallRecommendation: moderatorReport.overallRecommendation,
      strengths: moderatorReport.strengths,
      weaknesses: moderatorReport.weaknesses,
      panelEvaluations: moderatorReport.panelEvaluations,
      interruptions,
    },
  });

  await agentEventBus.emit("panel.completed", {
    userId,
    sessionId: panelSession.interviewSessionId,
    ...moderatorReport,
  });

  return moderatorReport;
}

export async function getPanelSession(panelSessionId: string, userId: string) {
  const panelSession = await prisma.panelInterviewSession.findFirst({
    where: { id: panelSessionId, userId },
    include: {
      interviewSession: {
        include: {
          panelMembers: { orderBy: { persona: "asc" } },
          turns: { orderBy: { timestamp: "asc" } },
        },
      },
    },
  });
  if (!panelSession) return null;

  const activeMember = panelSession.interviewSession.panelMembers.find(
    (m) => m.id === panelSession.currentSpeakerId
  );

  const panelScores = panelSession.interviewSession.panelMembers.map((m) => {
    const ev = m.evaluation as PanelistEvaluation | null;
    return {
      id: m.id,
      name: m.name,
      role: m.role,
      persona: m.persona,
      voiceId: m.voiceId,
      hiringRecommendation: m.hiringRecommendation,
      technicalScore: ev?.technicalScore,
      communicationScore: ev?.communicationScore,
      confidenceScore: ev?.confidenceScore,
      feedback: ev?.feedback,
    };
  });

  return {
    panelSessionId: panelSession.id,
    interviewSessionId: panelSession.interviewSessionId,
    status: panelSession.status,
    mode: panelSession.mode,
    targetRole: panelSession.interviewSession.targetRole,
    activeSpeaker: activeMember
      ? { id: activeMember.id, name: activeMember.name, role: activeMember.role, voiceId: activeMember.voiceId }
      : null,
    panel: panelScores,
    moderatorReport: panelSession.moderatorReport,
    progress: { turnCount: panelSession.turnCount, maxTurns: panelSession.maxTurns },
    transcript: panelSession.interviewSession.turns.map((t) => ({
      id: t.id,
      role: t.role as "ai" | "student",
      text: t.content,
      speaker: (t.analysis as { speaker?: string })?.speaker || (t.role === "student" ? "You" : MODERATOR_NAME),
      timestamp: t.timestamp.toISOString(),
      action: (t.analysis as { action?: string })?.action,
    })),
  };
}

export async function synthesizePanelSpeech(text: string, voiceId: string) {
  const result = await ttsAdapter.synthesize(text, voiceId);
  return {
    audioBase64: result.audioBase64,
    source: result.source,
    useBrowserFallback: result.source === "browser_fallback",
    voiceId: result.voiceId,
  };
}
