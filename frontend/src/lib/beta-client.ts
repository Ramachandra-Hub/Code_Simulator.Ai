import { apiFetch } from "./api-client";

export const FEEDBACK_TYPES = {
  REPORT_ISSUE: "report_issue",
  SUGGEST_IMPROVEMENT: "suggest_improvement",
  RATE_INTERVIEW: "rate_interview",
  RATE_CAREER_COACH: "rate_career_coach",
} as const;

export async function submitFeedback(input: {
  type: string;
  rating?: number;
  message?: string;
  context?: Record<string, unknown>;
}) {
  return apiFetch("/feedback", { method: "POST", body: JSON.stringify(input) });
}

export async function trackAnalyticsEvent(event: string, metadata?: Record<string, unknown>) {
  return apiFetch("/analytics/track", { method: "POST", body: JSON.stringify({ event, metadata }) }).catch(() => {});
}

export async function getOnboarding() {
  return apiFetch<{
    welcomeSeen: boolean;
    tourCompleted: boolean;
    checklist: Record<string, boolean>;
  }>("/user/onboarding");
}

export async function patchOnboarding(patch: {
  welcomeSeen?: boolean;
  tourCompleted?: boolean;
  checklistKey?: string;
  done?: boolean;
}) {
  return apiFetch("/user/onboarding", { method: "PATCH", body: JSON.stringify(patch) });
}

export async function getSystemStatus() {
  return apiFetch<{
    status: string;
    services: Record<string, { status: string; message: string }>;
  }>("/system/status");
}

export interface BetaDashboardData {
  stats: {
    period: string;
    activeUsers: number;
    interviewsStarted: number;
    interviewsCompleted: number;
    codingRoundsCompleted: number;
    careerCoachOpens: number;
    pdfDownloads: number;
    averagePlacementReadiness: number;
    completionRate: number;
    recentFeedback: Array<{
      id: string;
      type: string;
      rating: number | null;
      message: string | null;
      createdAt: string;
      user: { name: string; email: string };
    }>;
    eventBreakdown: Array<{ event: string; count: number }>;
  };
  performance: {
    summary: Array<{ category: string; count: number; avgMs: number; maxMs: number }>;
    recent: Array<{ route: string; category: string; durationMs: number; createdAt: string }>;
  };
}

export async function getBetaDashboard() {
  return apiFetch<BetaDashboardData>("/beta/dashboard");
}

export async function getBetaStability(hours = 24) {
  return apiFetch<{
    period: { hours: number; since: string };
    crashFrequency: { totalErrors: number; errorsPerHour: number; bySource: Array<{ source: string; count: number }> };
    slowestPages: Array<{ route: string; avgMs: number; maxMs: number; count: number }>;
    slowestApis: Array<{ route: string; avgMs: number; maxMs: number; count: number }>;
    performanceByCategory: Array<{ category: string; count: number; avgMs: number; maxMs: number }>;
    commonErrors: Array<{ source: string; message: string; count: number; lastSeen: string }>;
    recentErrors: Array<{ id: string; source: string; route: string | null; message: string; createdAt: string }>;
  }>(`/beta/stability?hours=${hours}`);
}

export function recordPageLoad(route: string, durationMs: number) {
  return apiFetch("/beta/performance", {
    method: "POST",
    body: JSON.stringify({ route, durationMs, category: "page_load" }),
  }).catch(() => {});
}

export async function getBetaMonitoring(hours = 1) {
  return apiFetch<{
    monitoring: {
      period: { hours: number; since: string };
      errorRate: {
        totalErrors: number;
        sampledRequests: number;
        errorsPerHour: number;
        errorRatePercent: number;
      };
      apiLatency: { count: number; avgMs: number; maxMs: number; p95Ms: number };
      ollamaLatency: { count: number; avgMs: number; maxMs: number; p95Ms: number };
      databaseLatency: { count: number; avgMs: number; maxMs: number; p95Ms: number };
      byCategory: Array<{ category: string; count: number; avgMs: number; maxMs: number; p95Ms: number }>;
    };
    security: {
      passed: boolean;
      checks: Array<{ name: string; pass: boolean; severity: string; detail: string }>;
    };
  }>(`/beta/monitoring?hours=${hours}`);
}

export async function getBetaInsights(days = 7) {
  return apiFetch(`/beta/insights?days=${days}`);
}

export async function refreshBetaInsights() {
  return apiFetch("/beta/insights", { method: "POST" });
}

export async function getAiQualityDashboard(days = 7) {
  return apiFetch(`/beta/ai-quality?days=${days}`);
}

export async function refreshAiQualityReport() {
  return apiFetch("/beta/ai-quality", { method: "POST" });
}

export async function recordRecommendationOutcome(input: {
  recommendationId?: string;
  title: string;
  action: "accepted" | "dismissed" | "ignored" | "completed";
}) {
  return apiFetch("/intelligence/recommendations/outcome", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeRoadmapItem(itemId: string) {
  return apiFetch("/intelligence/roadmap/complete", {
    method: "POST",
    body: JSON.stringify({ itemId }),
  });
}
