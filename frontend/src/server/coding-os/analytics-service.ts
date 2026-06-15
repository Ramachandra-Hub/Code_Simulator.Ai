import { prisma } from "../core/db/prisma";
import { syncCodingTwin } from "./dsa-progress-service";

export async function computeCodingAnalytics(userId: string) {
  const submissions = await prisma.codeProblemSubmission.findMany({
    where: { userId },
    include: { problem: { select: { category: true, difficulty: true } } },
    orderBy: { submittedAt: "desc" },
  });

  const accepted = submissions.filter((s) => s.verdict === "accepted");
  const languagesUsed: Record<string, number> = {};
  const topicStats: Record<string, { solved: number; attempted: number }> = {};

  for (const s of submissions) {
    languagesUsed[s.language] = (languagesUsed[s.language] || 0) + 1;
    const cat = s.problem.category;
    if (!topicStats[cat]) topicStats[cat] = { solved: 0, attempted: 0 };
    topicStats[cat].attempted += 1;
    if (s.verdict === "accepted") topicStats[cat].solved += 1;
  }

  const strongTopics = Object.entries(topicStats)
    .filter(([, v]) => v.attempted >= 2 && v.solved / v.attempted >= 0.6)
    .map(([k]) => k);
  const weakTopics = Object.entries(topicStats)
    .filter(([, v]) => v.attempted >= 1 && v.solved / v.attempted < 0.4)
    .map(([k]) => k);

  const twin = await syncCodingTwin(userId);

  const snapshot = await prisma.codingAnalyticsSnapshot.upsert({
    where: { userId },
    create: {
      userId,
      problemsSolved: accepted.length,
      totalAttempts: submissions.length,
      acceptanceRate: submissions.length ? (accepted.length / submissions.length) * 100 : 0,
      languagesUsed,
      strongTopics,
      weakTopics,
      codingReadiness: twin.codingReadiness,
    },
    update: {
      problemsSolved: accepted.length,
      totalAttempts: submissions.length,
      acceptanceRate: submissions.length ? (accepted.length / submissions.length) * 100 : 0,
      languagesUsed,
      strongTopics,
      weakTopics,
      codingReadiness: twin.codingReadiness,
      computedAt: new Date(),
    },
  });

  return snapshot;
}

export async function getHistory(userId: string, limit = 50) {
  const [runs, submissions, reviews] = await Promise.all([
    prisma.codeProblemRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { problem: { select: { title: true, slug: true } } },
    }),
    prisma.codeProblemSubmission.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: limit,
      include: {
        problem: { select: { title: true, slug: true } },
        review: true,
      },
    }),
    prisma.codeReviewReport.findMany({
      where: { submission: { userId } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { submission: { include: { problem: { select: { title: true } } } } },
    }),
  ]);

  return { runs, submissions, reviews };
}
