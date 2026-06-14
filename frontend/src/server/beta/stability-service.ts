import { prisma } from "../core/db/prisma";
import { getPerformanceSummary } from "./performance-service";

function aggregateByRoute(
  metrics: Array<{ route: string; durationMs: number }>
): Array<{ route: string; avgMs: number; maxMs: number; count: number }> {
  const buckets: Record<string, { total: number; max: number; count: number }> = {};
  for (const m of metrics) {
    const b = buckets[m.route] || { total: 0, max: 0, count: 0 };
    b.total += m.durationMs;
    b.max = Math.max(b.max, m.durationMs);
    b.count += 1;
    buckets[m.route] = b;
  }
  return Object.entries(buckets)
    .map(([route, s]) => ({
      route,
      avgMs: Math.round(s.total / s.count),
      maxMs: s.max,
      count: s.count,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

export async function getStabilityReport(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [errors, pageMetrics, apiMetrics, performance] = await Promise.all([
    prisma.systemError.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.performanceMetric.findMany({
      where: { createdAt: { gte: since }, category: "page_load" },
      select: { route: true, durationMs: true },
      take: 1000,
    }),
    prisma.performanceMetric.findMany({
      where: {
        createdAt: { gte: since },
        category: { in: ["api", "interview_response", "career_coach", "database", "ollama", "interview_generation"] },
      },
      select: { route: true, durationMs: true },
      take: 2000,
    }),
    getPerformanceSummary(hours),
  ]);

  const bySource: Record<string, number> = {};
  const byMessage: Record<string, { source: string; count: number; lastSeen: Date }> = {};
  for (const e of errors) {
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    const key = `${e.source}::${e.message.slice(0, 120)}`;
    const existing = byMessage[key];
    if (!existing) {
      byMessage[key] = { source: e.source, count: 1, lastSeen: e.createdAt };
    } else {
      existing.count += 1;
      if (e.createdAt > existing.lastSeen) existing.lastSeen = e.createdAt;
    }
  }

  const commonErrors = Object.entries(byMessage)
    .map(([key, v]) => ({
      source: v.source,
      message: key.split("::").slice(1).join("::"),
      count: v.count,
      lastSeen: v.lastSeen.toISOString(),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    period: { hours, since: since.toISOString() },
    crashFrequency: {
      totalErrors: errors.length,
      errorsPerHour: hours ? Math.round((errors.length / hours) * 100) / 100 : 0,
      bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
    },
    slowestPages: aggregateByRoute(pageMetrics).slice(0, 10),
    slowestApis: aggregateByRoute(apiMetrics).slice(0, 15),
    performanceByCategory: performance.summary,
    commonErrors,
    recentErrors: errors.slice(0, 20).map((e) => ({
      id: e.id,
      source: e.source,
      route: e.route,
      message: e.message.slice(0, 200),
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
