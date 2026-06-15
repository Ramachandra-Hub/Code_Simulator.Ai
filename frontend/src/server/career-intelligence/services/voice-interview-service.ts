import { prisma } from "../../core/db/prisma";
import type { InterviewType } from "@prisma/client";
import type { VoiceProfile } from "../../core/voice/adapters/tts-adapter";
import { voiceInterviewAgent } from "../agents/voice-interview-agent";
import { runVoiceAnalysisAgent } from "../agents/voice-analysis-agent";
import { createSession, submitAnswer, completeSession } from "./interview-service";
import { updateDigitalTwin } from "../memory/digital-twin";
import { withPerformance } from "../../beta/performance-service";
import { computeInterviewRealismScore } from "./interview-realism";

const VOICE_INTERVIEW_TYPES = new Set<InterviewType>(["hr", "technical", "behavioral", "system_design"]);

export function isVoiceInterviewType(type: string): type is InterviewType {
  return VOICE_INTERVIEW_TYPES.has(type as InterviewType);
}

export async function startVoiceInterview(
  userId: string,
  interviewType: InterviewType,
  resumeId?: string,
  voiceProfile: VoiceProfile | string = "professional",
  companyPack?: string
) {
  if (!isVoiceInterviewType(interviewType)) {
    throw new Error(`Voice mode supports: hr, technical, behavioral, system_design`);
  }

  const interview = await createSession(userId, interviewType, resumeId, { companyPack });

  await prisma.interviewSession.update({
    where: { id: interview.session.id },
    data: {
      metadata: {
        ...interview.metadata,
        mode: "voice",
        voiceProfile,
      } as object,
    },
  });

  const voiceSession = await prisma.voiceInterviewSession.create({
    data: {
      interviewSessionId: interview.session.id,
      userId,
      interviewType,
      voiceProfile: String(voiceProfile),
      status: "active",
      recording: false,
    },
  });

  await prisma.voiceTranscript.create({
    data: {
      voiceInterviewSessionId: voiceSession.id,
      role: "ai",
      text: interview.firstQuestion,
      isFinal: true,
    },
  });

  const tts = await voiceInterviewAgent.speakQuestion(interview.firstQuestion, voiceProfile);

  return {
    voiceSessionId: voiceSession.id,
    interviewSessionId: interview.session.id,
    interviewType,
    voiceProfile,
    firstQuestion: interview.firstQuestion,
    progress: {
      questionIndex: 0,
      maxQuestions: 6,
      followUpCount: 0,
      difficulty: interview.metadata.difficulty,
    },
    tts: {
      audioBase64: tts.audioBase64,
      source: tts.source,
      useBrowserFallback: tts.useBrowserFallback,
    },
    sttAvailable: await import("../../core/voice/adapters/whisper-adapter").then((m) => m.whisperAdapter.isAvailable()),
  };
}

export async function stopVoiceInterview(voiceSessionId: string, userId: string) {
  const session = await prisma.voiceInterviewSession.findFirst({
    where: { id: voiceSessionId, userId },
  });
  if (!session) throw new Error("Voice session not found");

  await prisma.voiceInterviewSession.update({
    where: { id: voiceSessionId },
    data: { status: "stopped", recording: false, stoppedAt: new Date() },
  });

  return { ok: true, voiceSessionId };
}

export async function processVoiceTranscript(input: {
  voiceSessionId: string;
  userId: string;
  transcript: string;
  audioDurationMs?: number;
  audioBase64?: string;
}) {
  const voiceSession = await prisma.voiceInterviewSession.findFirst({
    where: { id: input.voiceSessionId, userId: input.userId, status: "active" },
    include: { interviewSession: true },
  });
  if (!voiceSession) throw new Error("Active voice session not found");

  let transcript = input.transcript.trim();
  if (!transcript && input.audioBase64) {
    const stt = await withPerformance("voice_stt", "/api/voice/transcript", () =>
      voiceInterviewAgent.transcribeAudio(input.audioBase64!)
    );
    transcript = stt.text;
  }
  if (!transcript) throw new Error("Empty transcript — speak clearly or try again");

  await prisma.voiceTranscript.create({
    data: {
      voiceInterviewSessionId: voiceSession.id,
      role: "student",
      text: transcript,
      isFinal: true,
      audioDurationMs: input.audioDurationMs,
    },
  });

  const answerResult = await withPerformance(
    "interview_response",
    `/api/voice/transcript`,
    () => submitAnswer(voiceSession.interviewSessionId, input.userId, transcript),
    "POST"
  );

  const voiceAnalysis = await runVoiceAnalysisAgent({
    transcript,
    audioDurationMs: input.audioDurationMs,
    answerConfidence: answerResult.evaluation?.confidence,
    communicationScore: answerResult.evaluation?.scores?.communication,
    interviewType: voiceSession.interviewType,
  });

  const turnIndex = answerResult.progress?.questionIndex ?? 0;
  await prisma.voiceMetrics.create({
    data: {
      voiceInterviewSessionId: voiceSession.id,
      turnIndex,
      wordsPerMinute: voiceAnalysis.wordsPerMinute,
      fillerCount: voiceAnalysis.fillerCount,
      pauseCount: voiceAnalysis.pauseCount,
      confidenceEstimate: voiceAnalysis.confidenceEstimate,
      communicationScore: voiceAnalysis.communicationScore,
      clarityScore: voiceAnalysis.clarityScore,
      speakingPace: voiceAnalysis.speakingPace,
      metadata: { signals: voiceAnalysis.signals, fillers: voiceAnalysis.fillers } as object,
    },
  });

  void updateDigitalTwin(input.userId, {
    type: "voice",
    source: "voice.transcript",
    data: {
      communicationScore: voiceAnalysis.communicationScore,
      confidenceScore: voiceAnalysis.confidenceEstimate,
      speakingSkills: voiceAnalysis.clarityScore,
      wordsPerMinute: voiceAnalysis.wordsPerMinute,
      fillerCount: voiceAnalysis.fillerCount,
    },
  });

  let nextQuestion = answerResult.nextQuestion;
  let ttsPayload: { audioBase64: string | null; source: string; useBrowserFallback: boolean } | null = null;

  if (nextQuestion) {
    await prisma.voiceTranscript.create({
      data: {
        voiceInterviewSessionId: voiceSession.id,
        role: "ai",
        text: nextQuestion,
        isFinal: true,
      },
    });
    ttsPayload = await voiceInterviewAgent.speakQuestion(nextQuestion, voiceSession.voiceProfile);
  }

  if (answerResult.phase === "complete") {
    await finalizeVoiceInterview(voiceSession.id, input.userId);
    const realismScore = computeInterviewRealismScore({
      followUpCount: answerResult.progress?.followUpCount,
      turnCount: answerResult.progress?.questionIndex,
      recentQuestions: nextQuestion ? [nextQuestion] : [],
    });
    return {
      transcript,
      evaluation: answerResult.evaluation,
      phase: "complete" as const,
      progress: answerResult.progress,
      nextQuestion: null,
      realism: {
        interruptions: 0,
        followUps: answerResult.progress?.followUpCount ?? 0,
        contextReferences: 0,
        turnCount: answerResult.progress?.questionIndex ?? 0,
      },
      realismScore,
      voiceMetrics: {
        wordsPerMinute: voiceAnalysis.wordsPerMinute,
        fillerCount: voiceAnalysis.fillerCount,
        pauseCount: voiceAnalysis.pauseCount,
        confidenceEstimate: voiceAnalysis.confidenceEstimate,
        communicationScore: voiceAnalysis.communicationScore,
        clarityScore: voiceAnalysis.clarityScore,
        speakingPace: voiceAnalysis.speakingPace,
      },
      voiceAnalysis: {
        summary: voiceAnalysis.summary,
        recommendations: voiceAnalysis.recommendations,
      },
      tts: null,
      completed: true,
    };
  }

  const realismScore = computeInterviewRealismScore({
    followUpCount: answerResult.progress?.followUpCount,
    turnCount: answerResult.progress?.questionIndex,
    recentQuestions: nextQuestion ? [nextQuestion] : [],
  });

  return {
    transcript,
    evaluation: answerResult.evaluation,
    phase: answerResult.phase,
    progress: answerResult.progress,
    nextQuestion,
    realism: {
      interruptions: 0,
      followUps: answerResult.progress?.followUpCount ?? 0,
      contextReferences: 0,
      turnCount: answerResult.progress?.questionIndex ?? 0,
    },
    realismScore,
    voiceMetrics: {
      wordsPerMinute: voiceAnalysis.wordsPerMinute,
      fillerCount: voiceAnalysis.fillerCount,
      pauseCount: voiceAnalysis.pauseCount,
      confidenceEstimate: voiceAnalysis.confidenceEstimate,
      communicationScore: voiceAnalysis.communicationScore,
      clarityScore: voiceAnalysis.clarityScore,
      speakingPace: voiceAnalysis.speakingPace,
    },
    voiceAnalysis: {
      summary: voiceAnalysis.summary,
      recommendations: voiceAnalysis.recommendations,
    },
    tts: ttsPayload,
  };
}

async function finalizeVoiceInterview(voiceSessionId: string, userId: string) {
  const voiceSession = await prisma.voiceInterviewSession.findFirst({
    where: { id: voiceSessionId, userId },
    include: { metrics: true },
  });
  if (!voiceSession) return;

  const aggregates = aggregateVoiceMetrics(voiceSession.metrics);
  const recommendations = buildVoiceRecommendations(aggregates);

  await prisma.voiceFeedback.create({
    data: {
      voiceInterviewSessionId: voiceSessionId,
      summary: `Voice interview complete. Avg ${aggregates.avgWpm} WPM, ${aggregates.totalFillers} fillers, clarity ${aggregates.avgClarity}/100.`,
      recommendations,
      strengths: aggregates.strengths,
      improvements: aggregates.improvements,
      source: "voice-analysis",
    },
  });

  await prisma.voiceInterviewSession.update({
    where: { id: voiceSessionId },
    data: { status: "completed", recording: false, stoppedAt: new Date() },
  });

  const result = await completeSession(voiceSession.interviewSessionId, userId);

  void updateDigitalTwin(userId, {
    type: "voice",
    source: "voice.completed",
    data: {
      sessionId: voiceSession.interviewSessionId,
      ...aggregates,
      scores: result.scores,
    },
  });

  return result;
}

function aggregateVoiceMetrics(metrics: Array<{
  wordsPerMinute: number | null;
  fillerCount: number;
  confidenceEstimate: number | null;
  communicationScore: number | null;
  clarityScore: number | null;
}>) {
  if (!metrics.length) {
    return {
      avgWpm: 0,
      totalFillers: 0,
      avgConfidence: 0,
      avgCommunication: 0,
      avgClarity: 0,
      strengths: [] as string[],
      improvements: ["Practice more voice interviews"] as string[],
    };
  }

  const avg = (vals: number[]) => Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const wpms = metrics.map((m) => m.wordsPerMinute || 0);
  const conf = metrics.map((m) => m.confidenceEstimate || 0);
  const comm = metrics.map((m) => m.communicationScore || 0);
  const clarity = metrics.map((m) => m.clarityScore || 0);
  const totalFillers = metrics.reduce((s, m) => s + m.fillerCount, 0);

  const strengths: string[] = [];
  const improvements: string[] = [];
  const avgComm = avg(comm);
  const avgConf = avg(conf);
  const avgClarity = avg(clarity);
  if (avgComm >= 75) strengths.push("Clear spoken communication");
  else improvements.push("Improve answer structure when speaking");
  if (avgConf >= 75) strengths.push("Confident vocal delivery");
  else improvements.push("Reduce hesitation and filler words");
  if (avgClarity >= 75) strengths.push("Good speaking clarity");
  if (totalFillers > 8) improvements.push(`Reduce filler words (${totalFillers} detected)`);

  return {
    avgWpm: avg(wpms),
    totalFillers,
    avgConfidence: avgConf,
    avgCommunication: avgComm,
    avgClarity,
    strengths,
    improvements,
  };
}

function buildVoiceRecommendations(agg: ReturnType<typeof aggregateVoiceMetrics>): string[] {
  const recs: string[] = [];
  if (agg.avgWpm > 165) recs.push("Slow down slightly — aim for 120–150 WPM");
  if (agg.avgWpm < 95) recs.push("Increase pace slightly to sound more engaged");
  if (agg.totalFillers > 5) recs.push("Replace fillers with brief pauses");
  if (agg.avgClarity < 70) recs.push("Use STAR format: Situation, Task, Action, Result");
  if (!recs.length) recs.push("Strong voice performance — keep practicing");
  return recs;
}

export async function getVoiceMetrics(voiceSessionId: string, userId: string) {
  const session = await prisma.voiceInterviewSession.findFirst({
    where: { id: voiceSessionId, userId },
    include: {
      metrics: { orderBy: { turnIndex: "asc" } },
      transcripts: { orderBy: { createdAt: "asc" } },
      feedback: { orderBy: { createdAt: "desc" }, take: 1 },
      interviewSession: { select: { id: true, type: true, status: true, scores: true } },
    },
  });
  if (!session) return null;

  const aggregates = aggregateVoiceMetrics(session.metrics);

  return {
    voiceSessionId: session.id,
    interviewSessionId: session.interviewSessionId,
    status: session.status,
    interviewType: session.interviewType,
    voiceProfile: session.voiceProfile,
    aggregates,
    metrics: session.metrics,
    transcripts: session.transcripts,
    feedback: session.feedback[0] || null,
    interview: session.interviewSession,
  };
}

export async function synthesizeVoiceTts(text: string, voiceProfile: VoiceProfile | string = "professional") {
  return voiceInterviewAgent.speakQuestion(text, voiceProfile);
}
