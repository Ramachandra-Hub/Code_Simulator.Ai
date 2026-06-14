import { prisma } from "../core/db/prisma";
import { getMonitoringSnapshot } from "./monitoring-service";

export async function getProductionLaunchMetrics(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const monitoring = await getMonitoringSnapshot(hours);

  const [
    interviewCompleted,
    interviewStarted,
    recruiterSearches,
    agentRuns,
    placementEvents,
  ] = await Promise.all([
    prisma.interviewSession.count({ where: { status: "completed", completedAt: { gte: since } } }),
    prisma.interviewSession.count({ where: { startedAt: { gte: since } } }),
    prisma.recruiterSearch.count({ where: { createdAt: { gte: since } } }).catch(() => 0),
    prisma.agentRun.count({ where: { createdAt: { gte: since } } }),
    prisma.placementReadiness.count({ where: { computedAt: { gte: since } } }),
  ]);

  const interviewCompletionRate =
    interviewStarted > 0 ? Math.round((interviewCompleted / interviewStarted) * 100) : 0;

  const aiLatency = monitoring.ollamaLatency;
  const apiLatency = monitoring.apiLatency;

  return {
    period: { hours, since: since.toISOString() },
    errorRate: monitoring.errorRate,
    latency: {
      apiP95Ms: apiLatency.p95Ms,
      apiAvgMs: apiLatency.avgMs,
      aiP95Ms: aiLatency.p95Ms,
      aiAvgMs: aiLatency.avgMs,
      dbP95Ms: monitoring.databaseLatency.p95Ms,
    },
    interview: {
      started: interviewStarted,
      completed: interviewCompleted,
      completionRatePercent: interviewCompletionRate,
    },
    recruiter: {
      copilotQueries: recruiterSearches,
    },
    ai: {
      agentRuns,
      avgResponseMs: aiLatency.avgMs,
    },
    placement: {
      readinessComputations: placementEvents,
    },
    health: {
      status: monitoring.errorRate.errorRatePercent < 5 ? "healthy" : "degraded",
    },
  };
}
