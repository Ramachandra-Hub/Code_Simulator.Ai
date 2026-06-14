import { prisma } from "../core/db/prisma";
import { ANALYTICS_EVENTS } from "./analytics-events";

export const BETA_ADMIN_ROLES = ["super_admin", "college_admin", "placement_officer"] as const;
const ADMIN_ROLES = new Set<string>(BETA_ADMIN_ROLES);

export function isBetaAdmin(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export async function getBetaDashboardStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    activeUsers,
    interviewsCompleted,
    codingCompleted,
    coachOpens,
    pdfDownloads,
    avgPlacement,
    recentFeedback,
    eventCounts,
  ] = await Promise.all([
    prisma.user.count({ where: { updatedAt: { gte: weekAgo } } }),
    prisma.usageEvent.count({
      where: { event: ANALYTICS_EVENTS.INTERVIEW_COMPLETED, createdAt: { gte: weekAgo } },
    }),
    prisma.usageEvent.count({
      where: { event: ANALYTICS_EVENTS.CODING_ROUND_COMPLETED, createdAt: { gte: weekAgo } },
    }),
    prisma.usageEvent.count({
      where: { event: ANALYTICS_EVENTS.CAREER_COACH_OPENED, createdAt: { gte: weekAgo } },
    }),
    prisma.usageEvent.count({
      where: { event: ANALYTICS_EVENTS.PDF_DOWNLOADED, createdAt: { gte: weekAgo } },
    }),
    prisma.placementReadiness.aggregate({
      _avg: { overallScore: true },
      where: { computedAt: { gte: weekAgo } },
    }),
    prisma.userFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.usageEvent.groupBy({
      by: ["event"],
      where: { createdAt: { gte: weekAgo } },
      _count: { event: true },
    }),
  ]);

  const interviewsStarted = eventCounts.find((e) => e.event === ANALYTICS_EVENTS.INTERVIEW_STARTED)?._count.event || 0;

  return {
    period: "7d",
    activeUsers,
    interviewsStarted,
    interviewsCompleted,
    codingRoundsCompleted: codingCompleted,
    careerCoachOpens: coachOpens,
    pdfDownloads,
    averagePlacementReadiness: Math.round(avgPlacement._avg.overallScore || 0),
    completionRate:
      interviewsStarted > 0 ? Math.round((interviewsCompleted / interviewsStarted) * 100) : 0,
    recentFeedback,
    eventBreakdown: eventCounts.map((e) => ({ event: e.event, count: e._count.event })),
  };
}
