import { prisma } from "../../core/db/prisma";
import { AgentFactory } from "../../core/agent/agent-factory";
import { agentEventBus } from "../../core/events/agent-event-bus";
import { QUESTION_BANK } from "../knowledge/question-bank";
import { getCompanyPack } from "@/lib/company-interview-packs";
import { ensureDigitalTwin } from "../memory/digital-twin";
import { runInterviewTurn } from "../workflows/interview-graph";
import { createCodingSession } from "./coding-service";
import type { InterviewType } from "@prisma/client";

const MAX_QUESTIONS = 6;
const MAX_FOLLOWUPS_PER_QUESTION = 2;

interface SessionMetadata {
  questions: string[];
  asked: string[];
  questionIndex: number;
  followUpCount: number;
  difficulty: "easy" | "medium" | "hard";
  budgetReached: boolean;
  companyPack?: string;
}

function defaultMetadata(type: InterviewType): SessionMetadata {
  return {
    questions: QUESTION_BANK[type] || QUESTION_BANK.technical,
    asked: [],
    questionIndex: 0,
    followUpCount: 0,
    difficulty: "medium",
    budgetReached: false,
  };
}

function getMeta(raw: unknown, type: InterviewType): SessionMetadata {
  const base = defaultMetadata(type);
  if (!raw || typeof raw !== "object") return base;
  return { ...base, ...(raw as Partial<SessionMetadata>) };
}

async function generateNextQuestion(
  type: InterviewType,
  meta: SessionMetadata,
  resume: { targetRole: string; data: unknown } | null,
  userId: string,
  sessionId: string,
  twinContext?: { weaknesses: string[]; strengths: string[] }
): Promise<string> {
  const targetRole = resume?.targetRole || "Software Engineer";
  const skills = (resume?.data as { skills?: string[] })?.skills || [];
  const company = meta.companyPack ? getCompanyPack(meta.companyPack) : null;
  const companyContext = company
    ? `Company: ${company.name}. Style: ${company.interviewStyle}. Focus: ${company.focusAreas.join(", ")}.`
    : "";

  const generator = AgentFactory.create("question-generation");
  const generated = await generator.run(
    {
      type: company ? "technical" : type,
      context: {
        targetRole,
        skills,
        difficulty: meta.difficulty,
        role: targetRole,
        weakAreas: twinContext?.weaknesses || [],
        strengths: twinContext?.strengths || [],
        companyContext,
        resumeProjects: JSON.stringify((resume?.data as { projects?: unknown[] })?.projects || []).slice(0, 1500),
      },
      asked: meta.asked,
      bank: meta.questions,
    },
    { userId, sessionId }
  );

  let question = (generated.result as { question: string }).question;

  const agentMap: Record<string, string> = {
    hr: "hr-interview",
    technical: "technical-interview",
    behavioral: "behavioral-interview",
    coding: "coding-interview",
    system_design: "technical-interview",
    panel: "technical-interview",
    voice: "technical-interview",
    company_specific: "technical-interview",
  };

  if (!question || meta.asked.includes(question)) {
    const interviewer = AgentFactory.create(agentMap[type] || "technical-interview");
    const fallback = await interviewer.run(
      { targetRole, skills, difficulty: meta.difficulty, resume: resume?.data, asked: meta.asked },
      { userId, sessionId }
    );
    question = (fallback.result as { question: string })?.question || meta.questions[meta.questionIndex] || "Tell me about your experience.";
  }

  return question;
}

export async function createSession(
  userId: string,
  type: InterviewType,
  resumeId?: string,
  opts?: { companyPack?: string }
) {
  const resume = resumeId
    ? await prisma.resume.findFirst({ where: { id: resumeId, userId } })
    : await prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });

  const twin = await ensureDigitalTwin(userId);
  const meta = defaultMetadata(type);
  if (opts?.companyPack) meta.companyPack = opts.companyPack;
  const targetRole = resume?.targetRole || "Software Engineer";
  const tempId = "pending";
  const firstQuestion = await generateNextQuestion(
    type,
    meta,
    resume ? { targetRole, data: resume.data } : null,
    userId,
    tempId,
    { weaknesses: twin.weaknesses, strengths: twin.strengths }
  );

  meta.asked.push(firstQuestion);

  const session = await prisma.interviewSession.create({
    data: {
      userId,
      resumeId: resume?.id,
      type,
      status: "in_progress",
      targetRole,
      metadata: meta as object,
    },
  });

  await prisma.interviewTurn.create({
    data: {
      sessionId: session.id,
      role: "ai",
      content: `Welcome to your ${type.replace("_", " ")} interview${resume ? ` for ${resume.targetRole}` : ""}. Let's begin.`,
    },
  });

  await prisma.interviewTurn.create({
    data: {
      sessionId: session.id,
      role: "ai",
      content: firstQuestion,
    },
  });

  const { recordQuestionAsked } = await import("../../intelligence/question-intelligence-service");
  void recordQuestionAsked(session.id, userId, firstQuestion, type);

  let codingSessionId: string | undefined;
  if (type === "coding") {
    const coding = await createCodingSession(userId, {
      interviewSessionId: session.id,
      targetRole,
      resumeId: resume?.id,
      difficulty: meta.difficulty,
    });
    codingSessionId = coding.session.id;
  }

  return { session, firstQuestion, metadata: meta, codingSessionId };
}

export async function submitAnswer(sessionId: string, userId: string, answer: string) {
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      turns: { orderBy: { timestamp: "asc" } },
      resume: true,
    },
  });
  if (!session) throw new Error("Session not found");
  if (session.status !== "in_progress") throw new Error("Session not active");

  const meta = getMeta(session.metadata, session.type);
  const lastQuestionTurn = [...session.turns].reverse().find((t) => t.role === "ai" && session.turns.indexOf(t) > 0);
  const question = lastQuestionTurn?.content || meta.asked[meta.asked.length - 1] || "";

  await prisma.interviewTurn.create({
    data: { sessionId, role: "student", content: answer },
  });

  const resumeData = session.resume?.data as { skills?: string[]; targetRole?: string } | undefined;
  const keywords = [...(resumeData?.skills || []), session.targetRole || ""].filter(Boolean);
  const previousAnswers = session.turns
    .filter((t) => t.role === "student")
    .map((t, idx) => {
      const aiTurns = session.turns.filter((x) => x.role === "ai");
      const q = aiTurns[idx + 1]?.content || aiTurns[idx]?.content || "";
      return { question: q, answer: t.content };
    });

  // Run the LangGraph interview turn: analyze -> decide -> (follow_up | next_question | complete)
  const turnResult = await runInterviewTurn({
    sessionId,
    userId,
    type: session.type,
    question,
    answer,
    keywords,
    asked: meta.asked,
    bank: meta.questions,
    context: {
      targetRole: session.targetRole,
      skills: resumeData?.skills,
      role: session.targetRole,
      previousAnswers,
      lastAnswer: answer,
    },
    questionIndex: meta.questionIndex,
    maxQuestions: MAX_QUESTIONS,
    followUpCount: meta.followUpCount,
    maxFollowUps: MAX_FOLLOWUPS_PER_QUESTION,
    difficulty: meta.difficulty,
  });

  const finalEvaluation = turnResult.evaluation;

  await prisma.responseAnalysis.create({
    data: {
      sessionId,
      answerType: finalEvaluation.answerType,
      confidence: finalEvaluation.confidence,
      signals: finalEvaluation.signals as object,
      followUp: finalEvaluation.followUp,
    },
  });

  await prisma.evaluation.createMany({
    data: (["relevance", "depth", "communication", "confidence"] as const).map((dim) => ({
      sessionId,
      dimension: dim,
      score: finalEvaluation.scores[dim],
      details: { question, keywordsMatched: finalEvaluation.keywordsMatched } as object,
    })),
  });

  await prisma.feedback.create({
    data: {
      sessionId,
      content: finalEvaluation.feedback,
      type: finalEvaluation.answerType,
    },
  });

  const lastAnswerTurn = await prisma.interviewTurn.findFirst({
    where: { sessionId, role: "student" },
    orderBy: { timestamp: "desc" },
  });
  if (lastAnswerTurn) {
    await prisma.interviewTurn.update({
      where: { id: lastAnswerTurn.id },
      data: { analysis: finalEvaluation as object },
    });
  }

  let nextQuestion: string | null = turnResult.nextQuestion;
  const phase = turnResult.phase;
  const updatedMeta = { ...meta, difficulty: turnResult.difficulty as "easy" | "medium" | "hard" };

  if (phase === "follow_up") {
    updatedMeta.followUpCount += 1;
    if (nextQuestion) updatedMeta.asked.push(nextQuestion);
  } else if (phase === "next_question") {
    updatedMeta.questionIndex += 1;
    updatedMeta.followUpCount = 0;
    if (nextQuestion && !updatedMeta.asked.includes(nextQuestion)) {
      updatedMeta.asked.push(nextQuestion);
    } else if (!nextQuestion) {
      const twin = await ensureDigitalTwin(userId);
      const fallback = await generateNextQuestion(
        session.type,
        updatedMeta,
        session.resume ? { targetRole: session.resume.targetRole, data: session.resume.data } : null,
        userId,
        sessionId,
        { weaknesses: twin.weaknesses, strengths: twin.strengths }
      );
      nextQuestion = fallback;
      updatedMeta.asked.push(fallback);
    }
  } else {
    updatedMeta.questionIndex += 1;
    updatedMeta.budgetReached = true;
  }

  if (nextQuestion) {
    await prisma.interviewTurn.create({
      data: { sessionId, role: "ai", content: nextQuestion, analysis: { phase } as object },
    });
  }

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { metadata: updatedMeta as object },
  });

  const interviewMeta = (session.metadata as Record<string, unknown>) || {};
  const codingRoundAvailable =
    session.type === "technical" &&
    updatedMeta.questionIndex >= 2 &&
    !interviewMeta.codingSessionId &&
    phase !== "complete";

  const { recordQuestionAnswered, recordQuestionAsked } = await import(
    "../../intelligence/question-intelligence-service"
  );
  const prevAnalysis = lastAnswerTurn?.analysis as { scores?: { overall?: number } } | null;
  void recordQuestionAnswered({
    sessionId,
    userId,
    questionText: question,
    interviewType: session.type,
    answer,
    overallScore: finalEvaluation.scores.overall,
    phase,
    previousScore: prevAnalysis?.scores?.overall,
  });
  if (nextQuestion && phase !== "complete") {
    void recordQuestionAsked(sessionId, userId, nextQuestion, session.type, { phase });
  }

  return {
    evaluation: finalEvaluation,
    nextQuestion,
    phase,
    progress: {
      questionIndex: updatedMeta.questionIndex,
      maxQuestions: MAX_QUESTIONS,
      followUpCount: updatedMeta.followUpCount,
      difficulty: updatedMeta.difficulty,
    },
    feedback: finalEvaluation.feedback,
    answerType: finalEvaluation.answerType,
    scores: finalEvaluation.scores,
    signals: finalEvaluation.signals,
    codingRoundAvailable,
  };
}

export async function completeSession(sessionId: string, userId: string) {
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      turns: { orderBy: { timestamp: "asc" } },
      evaluations: true,
      resume: { include: { atsScores: { take: 1, orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!session) throw new Error("Session not found");

  const aiTurns = session.turns.filter((t) => t.role === "ai");
  const studentTurns = session.turns.filter((t) => t.role === "student");

  const answers = studentTurns.map((t, i) => {
    const question = aiTurns[i + 1]?.content || aiTurns[i]?.content || "";
    const analysis = t.analysis as Record<string, unknown> | null;
    const scores = (analysis?.scores as { relevance: number; depth: number; communication: number; confidence: number; overall: number }) || {
      relevance: 50, depth: 50, communication: 50, confidence: 50, overall: 50,
    };
    return {
      question,
      answer: t.content,
      scores,
      feedback: (analysis?.feedback as string) || "",
      answerType: (analysis?.answerType as string) || "partial",
      keywordsMatched: (analysis?.keywordsMatched as string[]) || [],
    };
  });

  const evalAgent = AgentFactory.create("evaluation");
  const evalResult = await evalAgent.run({ answers }, { userId, sessionId });
  const overallScores = evalResult.result as { overallScore: number; dimensions: Record<string, number> };

  const dimensionAvgs = ["communication", "confidence", "relevance", "depth"].reduce(
    (acc, dim) => {
      const values = answers.map((a) => a.scores[dim as keyof typeof a.scores]);
      acc[dim] = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
      return acc;
    },
    {} as Record<string, number>
  );

  const fullScores = {
    overall: overallScores.overallScore,
    communication: dimensionAvgs.communication,
    confidence: dimensionAvgs.confidence,
    relevance: dimensionAvgs.relevance,
    technicalKnowledge: dimensionAvgs.depth,
    fluency: Math.round((dimensionAvgs.communication + dimensionAvgs.confidence) / 2),
  };

  const resumeScore = session.resume?.atsScores[0]?.score || 70;

  const placementAgent = AgentFactory.create("placement-readiness");
  const placement = await placementAgent.run(
    { resumeScore, interviewScore: fullScores.overall },
    { userId }
  );
  const placementResult = placement.result as {
    placementReadiness: number;
    hiringProbability: string;
  };

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (fullScores.communication >= 75) strengths.push("Clear communication");
  else improvements.push("Practice articulating answers with clearer structure");
  if (fullScores.confidence >= 75) strengths.push("Confident delivery");
  else improvements.push("Build confidence with concrete examples");
  if (fullScores.technicalKnowledge >= 75) strengths.push("Strong technical depth");
  else improvements.push("Deepen technical explanations");

  const teamProjectAnswers = answers.filter((a) => a.answerType === "team_ownership").length;
  if (teamProjectAnswers > 0) improvements.push(`Clarified ${teamProjectAnswers} team-project answers — keep emphasizing individual ownership`);

  const feedbackAgent = AgentFactory.create("feedback");
  const feedbackResult = await feedbackAgent.run(
    { scores: fullScores, weaknesses: improvements },
    { userId }
  );

  const report = {
    placementReadiness: placementResult.placementReadiness,
    resumeScore,
    interviewScore: fullScores.overall,
    combinedScore: Math.round(resumeScore * 0.35 + fullScores.overall * 0.65),
    strengths: strengths.length ? strengths : ["Showed up and engaged with the interview"],
    improvements: improvements.length ? improvements : ["Practice more mock interviews"],
    roleFit: `${session.targetRole || "Target role"} — ${placementResult.placementReadiness >= 70 ? "Strong" : "Developing"} fit`,
    recommendation: (feedbackResult.result as { feedback?: string })?.feedback || "Keep practicing mock interviews and refine weak areas.",
    hiringProbability: placementResult.hiringProbability,
  };

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      completedAt: new Date(),
      scores: fullScores as object,
      report: report as object,
    },
  });

  await prisma.interviewReport.upsert({
    where: { sessionId },
    create: {
      sessionId,
      placementReadiness: report.placementReadiness,
      resumeScore: report.resumeScore,
      interviewScore: report.interviewScore,
      combinedScore: report.combinedScore,
      strengths: report.strengths,
      improvements: report.improvements,
      roleFit: report.roleFit,
      recommendation: report.recommendation,
      hiringProbability: report.hiringProbability,
      data: { answers, evaluation: evalResult.result, scores: fullScores } as object,
    },
    update: {
      placementReadiness: report.placementReadiness,
      resumeScore: report.resumeScore,
      interviewScore: report.interviewScore,
      combinedScore: report.combinedScore,
      strengths: report.strengths,
      improvements: report.improvements,
      roleFit: report.roleFit,
      recommendation: report.recommendation,
      hiringProbability: report.hiringProbability,
      data: { answers, evaluation: evalResult.result, scores: fullScores } as object,
    },
  });

  const lastAiQuestion = [...session.turns].reverse().find((t) => t.role === "ai");
  const lastStudent = [...session.turns].reverse().find((t) => t.role === "student");
  const unanswered =
    lastAiQuestion &&
    (!lastStudent || lastStudent.timestamp < lastAiQuestion.timestamp)
      ? lastAiQuestion.content
      : null;
  if (unanswered && studentTurns.length < aiTurns.length - 1) {
    const { recordSessionAbandonment } = await import("../../intelligence/question-intelligence-service");
    void recordSessionAbandonment(sessionId, userId, unanswered, session.type);
  }

  await agentEventBus.emit("interview.completed", {
    userId,
    sessionId,
    type: session.type,
    targetRole: session.targetRole,
    scores: fullScores,
    report,
    strengths: report.strengths,
    weaknesses: report.improvements,
  });

  return { scores: fullScores, report, answers };
}

export async function getSession(sessionId: string, userId: string) {
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      turns: { orderBy: { timestamp: "asc" } },
      resume: true,
    },
  });
  if (!session) return null;

  const meta = getMeta(session.metadata, session.type);
  return {
    id: session.id,
    type: session.type,
    status: session.status,
    targetRole: session.targetRole,
    resumeId: session.resumeId,
    transcript: session.turns.map((t) => ({
      role: t.role as "ai" | "student",
      text: t.content,
      timestamp: t.timestamp.toISOString(),
    })),
    progress: {
      questionIndex: meta.questionIndex,
      maxQuestions: MAX_QUESTIONS,
      followUpCount: meta.followUpCount,
      difficulty: meta.difficulty,
    },
  };
}

export async function getSessions(userId: string) {
  return prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: {
      reportRecord: true,
    },
  });
}

export async function getReport(sessionId: string, userId: string) {
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      reportRecord: true,
      turns: { orderBy: { timestamp: "asc" } },
    },
  });
  if (!session) return null;

  return {
    id: session.id,
    type: session.type,
    targetRole: session.targetRole,
    status: session.status,
    completedAt: session.completedAt?.toISOString(),
    scores: session.scores,
    report: session.reportRecord,
    transcript: session.turns.map((t) => ({
      role: t.role as "ai" | "student",
      text: t.content,
      timestamp: t.timestamp.toISOString(),
    })),
  };
}
