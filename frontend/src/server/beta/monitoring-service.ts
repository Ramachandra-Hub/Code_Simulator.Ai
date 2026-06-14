import { prisma } from "../core/db/prisma";

function latencyStats(samples: number[]) {
  if (!samples.length) return { count: 0, avgMs: 0, maxMs: 0, p95Ms: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const total = samples.reduce((a, b) => a + b, 0);
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    count: samples.length,
    avgMs: Math.round(total / samples.length),
    maxMs: sorted[sorted.length - 1],
    p95Ms: sorted[p95Index],
  };
}

const OLLAMA_CATEGORIES = new Set([
  "ollama",
  "career_coach",
  "interview_response",
  "interview_generation",
]);

const API_CATEGORIES = new Set([
  "api",
  "career_coach",
  "interview_response",
  "interview_generation",
  "page_load",
  "client_api",
]);

export async function getMonitoringSnapshot(hours = 1) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [errors, metrics] = await Promise.all([
    prisma.systemError.count({ where: { createdAt: { gte: since } } }),
    prisma.performanceMetric.findMany({
      where: { createdAt: { gte: since } },
      select: { category: true, durationMs: true, route: true },
      take: 5000,
    }),
  ]);

  const byCategory: Record<string, number[]> = {};
  for (const m of metrics) {
    const bucket = byCategory[m.category] || [];
    bucket.push(m.durationMs);
    byCategory[m.category] = bucket;
  }

  const apiSamples = metrics
    .filter((m) => API_CATEGORIES.has(m.category) && m.category !== "database")
    .map((m) => m.durationMs);
  const ollamaSamples = metrics
    .filter((m) => OLLAMA_CATEGORIES.has(m.category))
    .map((m) => m.durationMs);
  const dbSamples = byCategory.database || [];

  const requestSamples = metrics.length;
  const errorRatePercent =
    requestSamples > 0 ? Math.round((errors / requestSamples) * 10000) / 100 : 0;

  return {
    period: { hours, since: since.toISOString() },
    errorRate: {
      totalErrors: errors,
      sampledRequests: requestSamples,
      errorsPerHour: hours ? Math.round((errors / hours) * 100) / 100 : 0,
      errorRatePercent,
    },
    apiLatency: latencyStats(apiSamples),
    ollamaLatency: latencyStats(ollamaSamples),
    databaseLatency: latencyStats(dbSamples),
    byCategory: Object.entries(byCategory).map(([category, samples]) => ({
      category,
      ...latencyStats(samples),
    })),
  };
}
