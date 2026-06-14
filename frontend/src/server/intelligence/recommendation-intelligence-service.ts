import { prisma } from "../core/db/prisma";
import { titleKey, computeRecommendationEffectiveness } from "./intelligence-keys";

async function upsertRecommendationRecord(
  title: string,
  category: string | null,
  patch: Partial<{
    timesShown: number;
    timesAccepted: number;
    timesDismissed: number;
    timesIgnored: number;
    timesCompleted: number;
    placementDelta: number;
    rating: number;
  }>
) {
  const key = titleKey(title);
  const existing = await prisma.recommendationEffectiveness.findUnique({ where: { titleKey: key } });

  const timesShown = (existing?.timesShown || 0) + (patch.timesShown || 0);
  const timesAccepted = (existing?.timesAccepted || 0) + (patch.timesAccepted || 0);
  const timesDismissed = (existing?.timesDismissed || 0) + (patch.timesDismissed || 0);
  const timesIgnored = (existing?.timesIgnored || 0) + (patch.timesIgnored || 0);
  const timesCompleted = (existing?.timesCompleted || 0) + (patch.timesCompleted || 0);
  const placementDeltaSum = (existing?.placementDeltaSum || 0) + (patch.placementDelta || 0);
  const placementDeltaCount =
    (existing?.placementDeltaCount || 0) + (patch.placementDelta !== undefined ? 1 : 0);
  const ratingSum = (existing?.ratingSum || 0) + (patch.rating || 0);
  const ratingCount = (existing?.ratingCount || 0) + (patch.rating ? 1 : 0);

  const avgPlacementDelta =
    placementDeltaCount > 0 ? placementDeltaSum / placementDeltaCount : 0;
  const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

  const effectivenessScore = computeRecommendationEffectiveness({
    timesShown,
    timesAccepted,
    timesCompleted,
    timesIgnored,
    avgPlacementDelta,
    avgRating,
  });

  return prisma.recommendationEffectiveness.upsert({
    where: { titleKey: key },
    create: {
      titleKey: key,
      title,
      category,
      timesShown: patch.timesShown || 0,
      timesAccepted: patch.timesAccepted || 0,
      timesDismissed: patch.timesDismissed || 0,
      timesIgnored: patch.timesIgnored || 0,
      timesCompleted: patch.timesCompleted || 0,
      placementDeltaSum: patch.placementDelta || 0,
      placementDeltaCount: patch.placementDelta !== undefined ? 1 : 0,
      ratingSum: patch.rating || 0,
      ratingCount: patch.rating ? 1 : 0,
      effectivenessScore,
    },
    update: {
      title,
      category,
      timesShown,
      timesAccepted,
      timesDismissed,
      timesIgnored,
      timesCompleted,
      placementDeltaSum,
      placementDeltaCount,
      ratingSum,
      ratingCount,
      effectivenessScore,
    },
  });
}

export async function recordRecommendationsShown(
  userId: string,
  recommendations: Array<{ id: string; title: string; description?: string | null; priority: number }>,
  placementBefore: number | null,
  batchId: string
) {
  try {
    for (const rec of recommendations) {
      const key = titleKey(rec.title);
      await prisma.recommendationOutcome.create({
        data: {
          userId,
          recommendationId: rec.id,
          title: rec.title,
          titleKey: key,
          action: "shown",
          placementBefore,
          metadata: { batchId, priority: rec.priority } as object,
        },
      });
      await upsertRecommendationRecord(rec.title, inferCategory(rec.title), { timesShown: 1 });
    }
  } catch {
    // non-blocking
  }
}

function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("interview") || t.includes("mock")) return "interview";
  if (t.includes("coding") || t.includes("dsa") || t.includes("leetcode")) return "coding";
  if (t.includes("resume") || t.includes("ats")) return "resume";
  if (t.includes("project") || t.includes("portfolio")) return "projects";
  if (t.includes("certif") || t.includes("course")) return "learning";
  return "general";
}

export async function recordRecommendationOutcome(input: {
  userId: string;
  recommendationId?: string;
  title: string;
  action: "accepted" | "dismissed" | "ignored" | "completed";
  placementBefore?: number;
  placementAfter?: number;
}) {
  const key = titleKey(input.title);
  const placementDelta =
    input.placementBefore !== undefined && input.placementAfter !== undefined
      ? input.placementAfter - input.placementBefore
      : undefined;

  await prisma.recommendationOutcome.create({
    data: {
      userId: input.userId,
      recommendationId: input.recommendationId,
      title: input.title,
      titleKey: key,
      action: input.action,
      placementBefore: input.placementBefore,
      placementAfter: input.placementAfter,
      metadata: placementDelta !== undefined ? { placementDelta } : undefined,
    },
  });

  const patch: Parameters<typeof upsertRecommendationRecord>[2] = {};
  if (input.action === "accepted") patch.timesAccepted = 1;
  if (input.action === "dismissed") patch.timesDismissed = 1;
  if (input.action === "ignored") patch.timesIgnored = 1;
  if (input.action === "completed") patch.timesCompleted = 1;
  if (placementDelta !== undefined) patch.placementDelta = placementDelta;

  await upsertRecommendationRecord(input.title, inferCategory(input.title), patch);
}

export async function correlateCoachRating(userId: string, rating: number) {
  try {
    const recent = await prisma.recommendationOutcome.findMany({
      where: { userId, action: "shown", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const seen = new Set<string>();
    for (const o of recent) {
      if (seen.has(o.titleKey)) continue;
      seen.add(o.titleKey);
      await upsertRecommendationRecord(o.title, inferCategory(o.title), { rating });
    }
  } catch {
    // non-blocking
  }
}

export async function measurePlacementImprovement(userId: string, placementAfter: number) {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const accepted = await prisma.recommendationOutcome.findMany({
      where: { userId, action: "accepted", createdAt: { gte: weekAgo } },
    });
    for (const o of accepted) {
      if (o.placementBefore === null) continue;
      const delta = placementAfter - o.placementBefore;
      await upsertRecommendationRecord(o.title, inferCategory(o.title), { placementDelta: delta });
    }
  } catch {
    // non-blocking
  }
}

export async function getTopRecommendations(limit = 10, order: "asc" | "desc" = "desc") {
  return prisma.recommendationEffectiveness.findMany({
    where: { timesShown: { gte: 1 } },
    orderBy: { effectivenessScore: order },
    take: limit,
  });
}

export async function getCoachQualityMetrics(days = 7) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const outcomes = await prisma.recommendationOutcome.groupBy({
    by: ["action"],
    where: { createdAt: { gte: since } },
    _count: { action: true },
  });

  const shown = outcomes.find((o) => o.action === "shown")?._count.action || 0;
  const accepted = outcomes.find((o) => o.action === "accepted")?._count.action || 0;
  const dismissed = outcomes.find((o) => o.action === "dismissed")?._count.action || 0;
  const completed = outcomes.find((o) => o.action === "completed")?._count.action || 0;

  const roadmapItems = await prisma.roadmapItem.count({
    where: { status: "completed", roadmap: { updatedAt: { gte: since } } },
  });
  const roadmapTotal = await prisma.roadmapItem.count({
    where: { roadmap: { updatedAt: { gte: since } } },
  });

  const coachRatings = await prisma.userFeedback.findMany({
    where: { type: "rate_career_coach", rating: { not: null }, createdAt: { gte: since } },
    select: { rating: true },
  });
  const avgCoachRating =
    coachRatings.length > 0
      ? Math.round((coachRatings.reduce((s, r) => s + (r.rating || 0), 0) / coachRatings.length) * 10) / 10
      : 0;

  return {
    acceptanceRate: shown > 0 ? Math.round((accepted / shown) * 100) : 0,
    dismissalRate: shown > 0 ? Math.round((dismissed / shown) * 100) : 0,
    completionRate: shown > 0 ? Math.round((completed / shown) * 100) : 0,
    roadmapCompletionRate: roadmapTotal > 0 ? Math.round((roadmapItems / roadmapTotal) * 100) : 0,
    avgCoachRating,
    outcomeBreakdown: outcomes.map((o) => ({ action: o.action, count: o._count.action })),
  };
}
