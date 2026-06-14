import { prisma } from "../core/db/prisma";

export async function recordPerformanceMetric(input: {
  route: string;
  method?: string;
  durationMs: number;
  category: "api" | "interview_generation" | "ollama" | "database" | string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.performanceMetric.create({
      data: {
        route: input.route,
        method: input.method || "GET",
        durationMs: Math.round(input.durationMs),
        category: input.category,
        statusCode: input.statusCode,
        metadata: input.metadata as object | undefined,
      },
    });
  } catch {
    // non-blocking
  }
}

export async function withPerformance<T>(
  category: string,
  route: string,
  fn: () => Promise<T>,
  method = "GET"
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    void recordPerformanceMetric({
      category,
      route,
      method,
      durationMs: Date.now() - start,
    });
  }
}

export async function getPerformanceSummary(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const metrics = await prisma.performanceMetric.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const byCategory: Record<string, { count: number; totalMs: number; maxMs: number }> = {};
  for (const m of metrics) {
    const bucket = byCategory[m.category] || { count: 0, totalMs: 0, maxMs: 0 };
    bucket.count += 1;
    bucket.totalMs += m.durationMs;
    bucket.maxMs = Math.max(bucket.maxMs, m.durationMs);
    byCategory[m.category] = bucket;
  }

  const summary = Object.entries(byCategory).map(([category, s]) => ({
    category,
    count: s.count,
    avgMs: s.count ? Math.round(s.totalMs / s.count) : 0,
    maxMs: s.maxMs,
  }));

  return { summary, recent: metrics.slice(0, 30) };
}
