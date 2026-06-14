import { prisma } from "../core/db/prisma";
import {
  questionKey,
  engagementFromAnswer,
  computeQuestionEffectiveness,
} from "./intelligence-keys";

async function upsertQuestionRecord(
  qText: string,
  interviewType: string,
  patch: Partial<{
    timesAsked: number;
    timesAnswered: number;
    timesSkipped: number;
    timesAbandoned: number;
    followUpCount: number;
    followUpImproved: number;
    scoreDelta: number;
    engagement: number;
  }>
) {
  const key = questionKey(qText, interviewType);
  const existing = await prisma.questionEffectiveness.findUnique({
    where: { questionKey_interviewType: { questionKey: key, interviewType } },
  });

  const timesAsked = (existing?.timesAsked || 0) + (patch.timesAsked || 0);
  const timesAnswered = (existing?.timesAnswered || 0) + (patch.timesAnswered || 0);
  const timesSkipped = (existing?.timesSkipped || 0) + (patch.timesSkipped || 0);
  const timesAbandoned = (existing?.timesAbandoned || 0) + (patch.timesAbandoned || 0);
  const followUpCount = (existing?.followUpCount || 0) + (patch.followUpCount || 0);
  const followUpImproved = (existing?.followUpImproved || 0) + (patch.followUpImproved || 0);
  const totalScore = (existing?.totalScore || 0) + (patch.scoreDelta || 0);
  const totalEngagement = (existing?.totalEngagement || 0) + (patch.engagement || 0);

  const avgScore = timesAnswered > 0 ? totalScore / timesAnswered : 50;
  const avgEngagement = timesAnswered > 0 ? totalEngagement / timesAnswered : 50;
  const avgRatingImpact =
    existing && existing.ratingImpactCount > 0
      ? existing.ratingImpactSum / existing.ratingImpactCount
      : 3;

  const effectivenessScore = computeQuestionEffectiveness({
    timesAsked,
    timesAnswered,
    timesSkipped,
    timesAbandoned,
    followUpCount,
    followUpImproved,
    avgScore,
    avgEngagement,
    avgRatingImpact,
  });

  return prisma.questionEffectiveness.upsert({
    where: { questionKey_interviewType: { questionKey: key, interviewType } },
    create: {
      questionKey: key,
      questionText: qText.slice(0, 500),
      interviewType,
      timesAsked: patch.timesAsked || 0,
      timesAnswered: patch.timesAnswered || 0,
      timesSkipped: patch.timesSkipped || 0,
      timesAbandoned: patch.timesAbandoned || 0,
      followUpCount: patch.followUpCount || 0,
      followUpImproved: patch.followUpImproved || 0,
      totalScore: patch.scoreDelta || 0,
      totalEngagement: patch.engagement || 0,
      effectivenessScore,
      lastSeenAt: new Date(),
    },
    update: {
      questionText: qText.slice(0, 500),
      timesAsked,
      timesAnswered,
      timesSkipped,
      timesAbandoned,
      followUpCount,
      followUpImproved,
      totalScore,
      totalEngagement,
      effectivenessScore,
      lastSeenAt: new Date(),
    },
  });
}

export async function recordQuestionAsked(
  sessionId: string,
  userId: string,
  questionText: string,
  interviewType: string,
  metadata?: Record<string, unknown>
) {
  try {
    const key = questionKey(questionText, interviewType);
    await prisma.interviewQualityEvent.create({
      data: {
        sessionId,
        userId,
        event: "question_asked",
        questionKey: key,
        questionText: questionText.slice(0, 500),
        metadata: metadata as object,
      },
    });
    await upsertQuestionRecord(questionText, interviewType, { timesAsked: 1 });
  } catch {
    // non-blocking
  }
}

export async function recordQuestionAnswered(input: {
  sessionId: string;
  userId: string;
  questionText: string;
  interviewType: string;
  answer: string;
  overallScore: number;
  phase: string;
  previousScore?: number;
}) {
  try {
    const key = questionKey(input.questionText, input.interviewType);
    const engagement = engagementFromAnswer(input.answer);
    const followUpImproved =
      input.phase === "follow_up" && input.previousScore !== undefined
        ? input.overallScore > input.previousScore
          ? 1
          : 0
        : 0;

    await prisma.interviewQualityEvent.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId,
        event: input.phase === "follow_up" ? "follow_up_asked" : "question_answered",
        questionKey: key,
        questionText: input.questionText.slice(0, 500),
        metadata: {
          overallScore: input.overallScore,
          engagement,
          phase: input.phase,
        } as object,
      },
    });

    await upsertQuestionRecord(input.questionText, input.interviewType, {
      timesAnswered: 1,
      scoreDelta: input.overallScore,
      engagement,
      followUpCount: input.phase === "follow_up" ? 1 : 0,
      followUpImproved,
    });
  } catch {
    // non-blocking
  }
}

export async function recordSessionAbandonment(
  sessionId: string,
  userId: string,
  unansweredQuestion: string | null,
  interviewType: string
) {
  try {
    await prisma.interviewQualityEvent.create({
      data: {
        sessionId,
        userId,
        event: "session_abandoned",
        questionKey: unansweredQuestion ? questionKey(unansweredQuestion, interviewType) : null,
        questionText: unansweredQuestion?.slice(0, 500),
      },
    });
    if (unansweredQuestion) {
      await upsertQuestionRecord(unansweredQuestion, interviewType, { timesAbandoned: 1 });
    }
  } catch {
    // non-blocking
  }
}

export async function applyInterviewRatingToQuestions(sessionId: string, rating: number) {
  try {
    const events = await prisma.interviewQualityEvent.findMany({
      where: { sessionId, event: { in: ["question_answered", "follow_up_asked"] } },
      select: { questionKey: true, questionText: true },
    });
    const seen = new Set<string>();
    for (const e of events) {
      if (!e.questionKey || seen.has(e.questionKey)) continue;
      seen.add(e.questionKey);
      const record = await prisma.questionEffectiveness.findFirst({
        where: { questionKey: e.questionKey },
      });
      if (!record) continue;
      const ratingImpactSum = record.ratingImpactSum + rating;
      const ratingImpactCount = record.ratingImpactCount + 1;
      const avgRatingImpact = ratingImpactSum / ratingImpactCount;
      const effectivenessScore = computeQuestionEffectiveness({
        timesAsked: record.timesAsked,
        timesAnswered: record.timesAnswered,
        timesSkipped: record.timesSkipped,
        timesAbandoned: record.timesAbandoned,
        followUpCount: record.followUpCount,
        followUpImproved: record.followUpImproved,
        avgScore: record.timesAnswered > 0 ? record.totalScore / record.timesAnswered : 50,
        avgEngagement: record.timesAnswered > 0 ? record.totalEngagement / record.timesAnswered : 50,
        avgRatingImpact,
      });
      await prisma.questionEffectiveness.update({
        where: { id: record.id },
        data: { ratingImpactSum, ratingImpactCount, effectivenessScore },
      });
    }
  } catch {
    // non-blocking
  }
}

export async function getTopQuestions(limit = 10, order: "asc" | "desc" = "desc") {
  return prisma.questionEffectiveness.findMany({
    where: { timesAsked: { gte: 1 } },
    orderBy: { effectivenessScore: order },
    take: limit,
  });
}

export async function getInterviewQualityMetrics(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await prisma.interviewQualityEvent.groupBy({
    by: ["event"],
    where: { createdAt: { gte: since } },
    _count: { event: true },
  });

  const asked = events.find((e) => e.event === "question_asked")?._count.event || 0;
  const answered = events.find((e) => e.event === "question_answered")?._count.event || 0;
  const abandoned = events.find((e) => e.event === "session_abandoned")?._count.event || 0;
  const followUps = events.find((e) => e.event === "follow_up_asked")?._count.event || 0;

  return {
    questionCompletionRate: asked > 0 ? Math.round((answered / asked) * 100) : 0,
    questionSkipRate: asked > 0 ? Math.round((abandoned / asked) * 100) : 0,
    followUpRate: answered > 0 ? Math.round((followUps / answered) * 100) : 0,
    abandonmentPoints: abandoned,
    eventBreakdown: events.map((e) => ({ event: e.event, count: e._count.event })),
  };
}
