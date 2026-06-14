import { prisma } from "../../core/db/prisma";
import { agentEventBus } from "../../core/events/agent-event-bus";
import { llmPromptJson } from "../prompts/agent-llm";
import { CodingProblemSchema } from "../prompts/schemas";
import { pickCodingProblem } from "../knowledge/coding-problem-bank";
import type { CodingProblemSpec } from "../evaluators/coding-evaluator";
import { runCodingSubmit, runCodeExecution } from "../workflows/coding-interview-graph";

const DEFAULT_STARTER: Record<string, string> = {
  python: "def solution():\n    # Write your code here\n    pass\n",
  javascript: "function solution() {\n  // Write your code here\n}\n",
  java: "class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  csharp: "class Solution {\n    static void Main() {}\n}\n",
};

interface SessionMetadata {
  askedProblems: string[];
  discussionIndex: number;
  discussionAnswers: string[];
}

function getMeta(raw: unknown): SessionMetadata {
  const base = { askedProblems: [] as string[], discussionIndex: 0, discussionAnswers: [] as string[] };
  if (!raw || typeof raw !== "object") return base;
  return { ...base, ...(raw as Partial<SessionMetadata>) };
}

async function generateProblem(
  targetRole: string,
  difficulty: string,
  skills: string[],
  asked: string[],
  userId: string,
  sessionId: string
): Promise<CodingProblemSpec & { starterCode: string; source: string }> {
  const fallback = pickCodingProblem(asked, difficulty);
  const bankStarter = DEFAULT_STARTER.python;

  try {
    const { data, valid } = await llmPromptJson(
      "coding",
      "problem-generation",
      {
        targetRole,
        difficulty,
        skills: JSON.stringify(skills),
        asked: JSON.stringify(asked),
      },
      CodingProblemSchema,
      { ...fallback, starterCode: bankStarter }
    );

    if (valid && data.title && data.description) {
      return {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty || (difficulty as "easy" | "medium" | "hard"),
        topics: data.topics || [],
        constraints: data.constraints,
        examples: data.examples || [],
        starterCode: data.starterCode || DEFAULT_STARTER.python,
        source: "llm-v2",
      };
    }
  } catch {
    // bank fallback
  }

  return {
    ...fallback,
    starterCode: bankStarter,
    source: "bank",
  };
}

export async function createCodingSession(
  userId: string,
  opts: {
    interviewSessionId?: string;
    targetRole?: string;
    difficulty?: string;
    language?: string;
    resumeId?: string;
  } = {}
) {
  const resume = opts.resumeId
    ? await prisma.resume.findFirst({ where: { id: opts.resumeId, userId } })
    : await prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });

  const targetRole = opts.targetRole || resume?.targetRole || "Software Engineer";
  const skills = (resume?.data as { skills?: string[] })?.skills || [];
  const difficulty = opts.difficulty || "medium";
  const language = opts.language || "python";

  const tempId = "pending";
  const problem = await generateProblem(targetRole, difficulty, skills, [], userId, tempId);

  const session = await prisma.codingSession.create({
    data: {
      userId,
      interviewSessionId: opts.interviewSessionId,
      status: "coding",
      targetRole,
      difficulty,
      language,
      problem: problem as object,
      metadata: { askedProblems: [problem.title], discussionIndex: 0, discussionAnswers: [] } as object,
    },
  });

  const starter = problem.starterCode || DEFAULT_STARTER[language] || DEFAULT_STARTER.python;

  await prisma.codingTurn.create({
    data: {
      sessionId: session.id,
      role: "ai",
      type: "problem",
      content: `**${problem.title}** (${problem.difficulty})\n\n${problem.description}${
        problem.constraints ? `\n\nConstraints: ${problem.constraints}` : ""
      }`,
      metadata: { source: problem.source } as object,
    },
  });

  if (opts.interviewSessionId) {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: opts.interviewSessionId, userId },
    });
    if (interview) {
      const meta = (interview.metadata as Record<string, unknown>) || {};
      await prisma.interviewSession.update({
        where: { id: opts.interviewSessionId },
        data: {
          metadata: { ...meta, codingSessionId: session.id, codingRoundActive: true } as object,
        },
      });
    }
  }

  return {
    session,
    problem: { ...problem, starterCode: starter },
    starterCode: starter,
  };
}

export async function getCodingSession(sessionId: string, userId: string) {
  const session = await prisma.codingSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      turns: { orderBy: { createdAt: "asc" } },
      evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      feedbacks: { orderBy: { createdAt: "desc" }, take: 1 },
      executionResults: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!session) return null;

  const meta = getMeta(session.metadata);
  const problem = session.problem as unknown as CodingProblemSpec & { starterCode?: string };
  const latestEval = session.evaluations[0];
  const latestFeedback = session.feedbacks[0];

  return {
    id: session.id,
    status: session.status,
    targetRole: session.targetRole,
    difficulty: session.difficulty,
    language: session.language,
    problem,
    starterCode: problem.starterCode || DEFAULT_STARTER[session.language] || DEFAULT_STARTER.python,
    interviewSessionId: session.interviewSessionId,
    score: session.score,
    progress: {
      discussionIndex: meta.discussionIndex,
      totalDiscussionQuestions: (latestFeedback?.discussionQuestions as string[])?.length || 0,
    },
    evaluation: latestEval
      ? {
          correctnessScore: latestEval.correctnessScore,
          complexityScore: latestEval.complexityScore,
          styleScore: latestEval.styleScore,
          overallScore: latestEval.overallScore,
          verdict: latestEval.verdict,
          timeComplexity: latestEval.timeComplexity,
          spaceComplexity: latestEval.spaceComplexity,
          source: latestEval.source,
        }
      : null,
    feedback: latestFeedback
      ? {
          content: latestFeedback.content,
          discussionQuestions: latestFeedback.discussionQuestions,
          actionableSteps: latestFeedback.actionableSteps,
          source: latestFeedback.source,
        }
      : null,
    turns: session.turns.map((t) => ({
      role: t.role,
      type: t.type,
      content: t.content,
      code: t.code,
      createdAt: t.createdAt.toISOString(),
    })),
    recentExecutions: session.executionResults.map((e) => ({
      verdict: e.verdict,
      stdout: e.stdout,
      stderr: e.stderr,
      runtime: e.runtime,
      isSubmission: e.isSubmission,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export async function runCodingCode(
  sessionId: string,
  userId: string,
  code: string,
  language: string,
  stdin?: string
) {
  const session = await prisma.codingSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Coding session not found");
  if (session.status === "completed") throw new Error("Session already completed");

  const result = await runCodeExecution(code, language, stdin);

  await prisma.executionResult.create({
    data: {
      sessionId,
      code,
      language,
      stdin: stdin || null,
      stdout: result.stdout,
      stderr: result.stderr,
      verdict: result.status.description,
      runtime: result.time ? parseFloat(result.time) : null,
      memory: result.memory,
      isSubmission: false,
    },
  });

  if (language !== session.language) {
    await prisma.codingSession.update({ where: { id: sessionId }, data: { language } });
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    verdict: result.status.description,
    runtime: result.time,
    memory: result.memory,
    status: result.status,
  };
}

export async function submitCodingCode(sessionId: string, userId: string, code: string, language: string) {
  const session = await prisma.codingSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Coding session not found");
  if (session.status === "completed") throw new Error("Session already completed");

  const problem = session.problem as unknown as CodingProblemSpec;

  await prisma.codingTurn.create({
    data: { sessionId, role: "student", type: "code", content: "Code submission", code },
  });

  const graphResult = await runCodingSubmit({
    sessionId,
    userId,
    problem,
    code,
    language,
  });

  const h = graphResult.heuristic;
  const j = graphResult.judge0Result;

  await prisma.executionResult.create({
    data: {
      sessionId,
      code,
      language,
      stdout: j.stdout,
      stderr: j.stderr,
      verdict: j.status.description,
      runtime: j.time ? parseFloat(j.time) : null,
      memory: j.memory,
      isSubmission: true,
    },
  });

  await prisma.codingEvaluation.create({
    data: {
      sessionId,
      correctnessScore: h.correctnessScore,
      complexityScore: h.complexityScore,
      styleScore: h.styleScore,
      overallScore: h.overallScore,
      verdict: h.verdict,
      runtime: j.time ? parseFloat(j.time) : null,
      memory: j.memory,
      timeComplexity: h.timeComplexity,
      spaceComplexity: h.spaceComplexity,
      details: { ...h, evaluationSource: j.source } as object,
      source: j.source === "judge0" ? "judge0" : "fallback",
    },
  });

  await prisma.codingFeedback.create({
    data: {
      sessionId,
      content: graphResult.feedback,
      discussionQuestions: graphResult.discussionQuestions as object,
      actionableSteps: graphResult.actionableSteps as object,
      source: graphResult.discussionValid ? "llm-v2" : "template-fallback",
    },
  });

  await prisma.codingTurn.create({
    data: {
      sessionId,
      role: "ai",
      type: "discussion",
      content: `${graphResult.openingPrompt}\n\n**Score: ${h.overallScore}/100** (${h.verdict})\nTime: ${h.timeComplexity} | Space: ${h.spaceComplexity}\n\n${graphResult.feedback}`,
      metadata: {
        discussionQuestions: graphResult.discussionQuestions,
        heuristic: h,
      } as object,
    },
  });

  const firstQuestion = graphResult.discussionQuestions[0];
  if (firstQuestion) {
    await prisma.codingTurn.create({
      data: { sessionId, role: "ai", type: "discussion_question", content: firstQuestion },
    });
  }

  await prisma.codingSession.update({
    where: { id: sessionId },
    data: { status: "discussion", score: h.overallScore, language },
  });

  return {
    evaluation: {
      correctnessScore: h.correctnessScore,
      complexityScore: h.complexityScore,
      styleScore: h.styleScore,
      overallScore: h.overallScore,
      verdict: h.verdict,
      passed: h.passed,
      timeComplexity: h.timeComplexity,
      spaceComplexity: h.spaceComplexity,
      runtime: j.time,
      memory: j.memory,
      stdout: j.stdout,
      source: j.source,
      evaluationSource: j.source,
    },
    feedback: graphResult.feedback,
    discussionQuestions: graphResult.discussionQuestions,
    openingPrompt: graphResult.openingPrompt,
    actionableSteps: graphResult.actionableSteps,
    phase: "discussion" as const,
  };
}

export async function discussCodingAnswer(sessionId: string, userId: string, answer: string) {
  const session = await prisma.codingSession.findFirst({
    where: { id: sessionId, userId },
    include: { feedbacks: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!session) throw new Error("Coding session not found");
  if (session.status !== "discussion") throw new Error("Not in discussion phase");

  const meta = getMeta(session.metadata);
  const questions = (session.feedbacks[0]?.discussionQuestions as string[]) || [];
  const currentQ = questions[meta.discussionIndex] || "Explain your approach.";

  await prisma.codingTurn.create({
    data: { sessionId, role: "student", type: "discussion_answer", content: answer },
  });

  meta.discussionAnswers.push(answer);
  const nextIndex = meta.discussionIndex + 1;
  meta.discussionIndex = nextIndex;

  let nextQuestion: string | null = null;
  let phase: "discussion" | "complete" = "discussion";

  if (nextIndex < questions.length) {
    nextQuestion = questions[nextIndex];
    await prisma.codingTurn.create({
      data: { sessionId, role: "ai", type: "discussion_question", content: nextQuestion },
    });
  } else {
    phase = "complete";
    await completeCodingSession(sessionId, userId);
  }

  await prisma.codingSession.update({
    where: { id: sessionId },
    data: { metadata: meta as object, status: phase === "complete" ? "completed" : "discussion" },
  });

  return {
    answeredQuestion: currentQ,
    nextQuestion,
    phase,
    progress: { discussionIndex: meta.discussionIndex, total: questions.length },
  };
}

export async function completeCodingSession(sessionId: string, userId: string) {
  const session = await prisma.codingSession.findFirst({
    where: { id: sessionId, userId },
    include: { evaluations: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!session) throw new Error("Coding session not found");

  const eval_ = session.evaluations[0];
  const overallScore = eval_?.overallScore ?? session.score ?? 50;
  const details = (eval_?.details as Record<string, unknown>) || {};

  await prisma.codingSession.update({
    where: { id: sessionId },
    data: { status: "completed", completedAt: new Date(), score: overallScore },
  });

  const { trackUsageEvent, ANALYTICS_EVENTS } = await import("../../beta/analytics-events");
  await trackUsageEvent(ANALYTICS_EVENTS.CODING_ROUND_COMPLETED, userId, {
    codingSessionId: sessionId,
    interviewSessionId: session.interviewSessionId,
    score: overallScore,
  });

  await agentEventBus.emit("coding.interview.completed", {
    userId,
    sessionId,
    interviewSessionId: session.interviewSessionId,
    score: overallScore,
    passed: details.passed ?? eval_?.verdict === "Accepted",
    verdict: eval_?.verdict,
    timeComplexity: eval_?.timeComplexity,
    spaceComplexity: eval_?.spaceComplexity,
    algorithmSkills: (details.algorithmSkills as number) ?? overallScore,
    problemSolving: (details.problemSolving as number) ?? overallScore,
    optimizationSkills: (details.optimizationSkills as number) ?? overallScore,
    codingReadiness: overallScore,
    targetRole: session.targetRole,
    difficulty: session.difficulty,
  });

  if (session.interviewSessionId) {
    const interview = await prisma.interviewSession.findFirst({
      where: { id: session.interviewSessionId },
    });
    if (interview) {
      const meta = (interview.metadata as Record<string, unknown>) || {};
      await prisma.interviewSession.update({
        where: { id: session.interviewSessionId },
        data: {
          metadata: {
            ...meta,
            codingRoundActive: false,
            codingRoundCompleted: true,
            codingScore: overallScore,
          } as object,
        },
      });
    }
  }

  return {
    score: overallScore,
    evaluation: eval_,
    interviewContinues: !!session.interviewSessionId,
    interviewSessionId: session.interviewSessionId,
  };
}

export async function triggerCodingRoundFromInterview(interviewSessionId: string, userId: string) {
  const interview = await prisma.interviewSession.findFirst({
    where: { id: interviewSessionId, userId, status: "in_progress" },
    include: { resume: true },
  });
  if (!interview) throw new Error("Interview session not found or not active");
  if (interview.type !== "technical" && interview.type !== "coding") {
    throw new Error("Coding round is available after technical interviews");
  }

  const meta = (interview.metadata as Record<string, unknown>) || {};
  if (meta.codingSessionId) {
    const existing = await getCodingSession(meta.codingSessionId as string, userId);
    if (existing && existing.status !== "completed") return { codingSessionId: meta.codingSessionId, existing: true, session: existing };
  }

  const result = await createCodingSession(userId, {
    interviewSessionId,
    targetRole: interview.targetRole || undefined,
    resumeId: interview.resumeId || undefined,
    difficulty: (meta.difficulty as string) || "medium",
  });

  return {
    codingSessionId: result.session.id,
    existing: false,
    session: await getCodingSession(result.session.id, userId),
    problem: result.problem,
    starterCode: result.starterCode,
  };
}
