import { prisma } from "../core/db/prisma";
import { ANALYTICS_EVENTS } from "./analytics-events";
import { FEEDBACK_TYPES } from "./feedback-service";

export interface DropOffPoint {
  stage: string;
  label: string;
  started: number;
  completed: number;
  dropOffCount: number;
  dropOffRate: number;
}

export interface ComplaintTheme {
  theme: string;
  count: number;
  examples: string[];
}

export interface FeatureRating {
  feature: string;
  type: string;
  avgRating: number;
  count: number;
  lowRatings: number;
}

export interface TrendPoint {
  date: string;
  started?: number;
  completed?: number;
  rate?: number;
  avgScore?: number;
}

export interface BetaInsightsPayload {
  period: { start: string; end: string; days: number };
  dropOffPoints: DropOffPoint[];
  complaints: ComplaintTheme[];
  lowestRatedFeatures: FeatureRating[];
  highestRatedFeatures: FeatureRating[];
  interviewCompletionTrend: TrendPoint[];
  codingCompletionTrend: TrendPoint[];
  placementReadinessTrend: TrendPoint[];
  completionMetrics: {
    interviewCompletionRate: number;
    codingCompletionRate: number;
    avgPlacementReadiness: number;
    placementReadinessChange: number;
  };
  feedbackSampleCount: number;
  eventTotals: Record<string, number>;
}

const COMPLAINT_KEYWORDS: Array<{ theme: string; patterns: RegExp[] }> = [
  { theme: "interview response time", patterns: [/slow|lag|delay|wait|time|loading|timeout/i] },
  { theme: "voice interviews", patterns: [/voice|mic|microphone|speech|audio|speak/i] },
  { theme: "coding execution", patterns: [/judge0|code exec|compile|run code|coding round/i] },
  { theme: "UI/UX issues", patterns: [/ui|ux|confus|navigat|layout|design|button/i] },
  { theme: "login/auth", patterns: [/login|auth|password|session|token/i] },
  { theme: "resume builder", patterns: [/resume|cv|ats/i] },
  { theme: "AI quality", patterns: [/ai|ollama|wrong|incorrect|hallucin|quality/i] },
  { theme: "mobile/browser", patterns: [/mobile|chrome|edge|browser|safari/i] },
];

function periodStart(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days + 1);
  return d;
}

function weekStart(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

async function countEvents(event: string, since: Date): Promise<number> {
  return prisma.usageEvent.count({ where: { event, createdAt: { gte: since } } });
}

function classifyComplaints(messages: string[]): ComplaintTheme[] {
  const buckets = new Map<string, { count: number; examples: string[] }>();

  for (const msg of messages) {
    if (!msg?.trim()) continue;
    let matched = false;
    for (const { theme, patterns } of COMPLAINT_KEYWORDS) {
      if (patterns.some((p) => p.test(msg))) {
        const b = buckets.get(theme) || { count: 0, examples: [] };
        b.count += 1;
        if (b.examples.length < 2) b.examples.push(msg.slice(0, 120));
        buckets.set(theme, b);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const b = buckets.get("other issues") || { count: 0, examples: [] };
      b.count += 1;
      if (b.examples.length < 2) b.examples.push(msg.slice(0, 120));
      buckets.set("other issues", b);
    }
  }

  return [...buckets.entries()]
    .map(([theme, v]) => ({ theme, count: v.count, examples: v.examples }))
    .sort((a, b) => b.count - a.count);
}

async function featureRatings(since: Date): Promise<FeatureRating[]> {
  const ratings = await prisma.userFeedback.findMany({
    where: {
      type: { in: [FEEDBACK_TYPES.RATE_INTERVIEW, FEEDBACK_TYPES.RATE_CAREER_COACH] },
      rating: { not: null },
      createdAt: { gte: since },
    },
    select: { type: true, rating: true, context: true },
  });

  const groups = new Map<string, { total: number; count: number; low: number; type: string }>();

  for (const r of ratings) {
    const ctx = (r.context || {}) as Record<string, unknown>;
    const feature =
      r.type === FEEDBACK_TYPES.RATE_INTERVIEW
        ? `Mock Interview${ctx.type ? ` (${ctx.type})` : ""}`
        : "AI Career Coach";
    const g = groups.get(feature) || { total: 0, count: 0, low: 0, type: r.type };
    g.total += r.rating!;
    g.count += 1;
    if (r.rating! <= 2) g.low += 1;
    groups.set(feature, g);
  }

  return [...groups.entries()].map(([feature, g]) => ({
    feature,
    type: g.type,
    avgRating: Math.round((g.total / g.count) * 10) / 10,
    count: g.count,
    lowRatings: g.low,
  }));
}

async function dailyEventTrend(
  startedEvent: string,
  completedEvent: string,
  since: Date
): Promise<TrendPoint[]> {
  const events = await prisma.usageEvent.findMany({
    where: {
      event: { in: [startedEvent, completedEvent] },
      createdAt: { gte: since },
    },
    select: { event: true, createdAt: true },
  });

  const byDay = new Map<string, { started: number; completed: number }>();
  const cursor = new Date(since);
  const end = new Date();
  while (cursor <= end) {
    byDay.set(isoDate(cursor), { started: 0, completed: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const e of events) {
    const day = isoDate(e.createdAt);
    const bucket = byDay.get(day) || { started: 0, completed: 0 };
    if (e.event === startedEvent) bucket.started += 1;
    else bucket.completed += 1;
    byDay.set(day, bucket);
  }

  return [...byDay.entries()].map(([date, v]) => ({
    date,
    started: v.started,
    completed: v.completed,
    rate: pct(v.completed, v.started),
  }));
}

async function placementTrend(since: Date): Promise<TrendPoint[]> {
  const records = await prisma.placementReadiness.findMany({
    where: { computedAt: { gte: since } },
    select: { overallScore: true, computedAt: true },
    orderBy: { computedAt: "asc" },
  });

  const byDay = new Map<string, { total: number; count: number }>();
  for (const r of records) {
    const day = isoDate(r.computedAt);
    const b = byDay.get(day) || { total: 0, count: 0 };
    b.total += r.overallScore;
    b.count += 1;
    byDay.set(day, b);
  }

  return [...byDay.entries()].map(([date, v]) => ({
    date,
    avgScore: Math.round(v.total / v.count),
  }));
}

export async function computeBetaInsights(days = 7): Promise<BetaInsightsPayload> {
  const since = periodStart(days);
  const mid = periodStart(Math.ceil(days / 2));

  const interviewStarted = await countEvents(ANALYTICS_EVENTS.INTERVIEW_STARTED, since);
  const interviewCompleted = await countEvents(ANALYTICS_EVENTS.INTERVIEW_COMPLETED, since);
  const codingStarted = await countEvents(ANALYTICS_EVENTS.CODING_ROUND_STARTED, since);
  const codingCompleted = await countEvents(ANALYTICS_EVENTS.CODING_ROUND_COMPLETED, since);

  const [feedbackItems, eventGroups, avgPlacement, avgPlacementPrior] = await Promise.all([
    prisma.userFeedback.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, message: true, rating: true },
    }),
    prisma.usageEvent.groupBy({
      by: ["event"],
      where: { createdAt: { gte: since } },
      _count: { event: true },
    }),
    prisma.placementReadiness.aggregate({
      _avg: { overallScore: true },
      where: { computedAt: { gte: since } },
    }),
    prisma.placementReadiness.aggregate({
      _avg: { overallScore: true },
      where: { computedAt: { gte: since, lt: mid } },
    }),
  ]);

  const interviewDrop = Math.max(0, interviewStarted - interviewCompleted);
  const codingDrop = Math.max(0, codingStarted - codingCompleted);

  const dropOffPoints: DropOffPoint[] = [
    {
      stage: "interview",
      label: "During mock interview",
      started: interviewStarted,
      completed: interviewCompleted,
      dropOffCount: interviewDrop,
      dropOffRate: pct(interviewDrop, interviewStarted),
    },
    {
      stage: "coding",
      label: "During coding round",
      started: codingStarted,
      completed: codingCompleted,
      dropOffCount: codingDrop,
      dropOffRate: pct(codingDrop, codingStarted),
    },
  ].sort((a, b) => b.dropOffRate - a.dropOffRate);

  const complaintMessages = feedbackItems
    .filter((f) => f.type === FEEDBACK_TYPES.REPORT_ISSUE || f.type === FEEDBACK_TYPES.SUGGEST_IMPROVEMENT)
    .map((f) => f.message || "")
    .filter(Boolean);

  const suggestionMessages = feedbackItems
    .filter((f) => f.type === FEEDBACK_TYPES.SUGGEST_IMPROVEMENT)
    .map((f) => f.message || "")
    .filter(Boolean);

  const complaints = classifyComplaints([...complaintMessages, ...suggestionMessages]);

  const ratings = await featureRatings(since);
  const lowestRatedFeatures = [...ratings].sort((a, b) => a.avgRating - b.avgRating).slice(0, 5);
  const highestRatedFeatures = [...ratings].sort((a, b) => b.avgRating - a.avgRating).slice(0, 5);

  const [interviewCompletionTrend, codingCompletionTrend, placementReadinessTrend] = await Promise.all([
    dailyEventTrend(ANALYTICS_EVENTS.INTERVIEW_STARTED, ANALYTICS_EVENTS.INTERVIEW_COMPLETED, since),
    dailyEventTrend(ANALYTICS_EVENTS.CODING_ROUND_STARTED, ANALYTICS_EVENTS.CODING_ROUND_COMPLETED, since),
    placementTrend(since),
  ]);

  const currentAvg = avgPlacement._avg.overallScore || 0;
  const priorAvg = avgPlacementPrior._avg.overallScore || currentAvg;

  const eventTotals: Record<string, number> = {};
  for (const g of eventGroups) eventTotals[g.event] = g._count.event;

  return {
    period: { start: since.toISOString(), end: new Date().toISOString(), days },
    dropOffPoints,
    complaints,
    lowestRatedFeatures,
    highestRatedFeatures,
    interviewCompletionTrend,
    codingCompletionTrend,
    placementReadinessTrend,
    completionMetrics: {
      interviewCompletionRate: pct(interviewCompleted, interviewStarted),
      codingCompletionRate: pct(codingCompleted, codingStarted),
      avgPlacementReadiness: Math.round(currentAvg),
      placementReadinessChange: Math.round(currentAvg - priorAvg),
    },
    feedbackSampleCount: feedbackItems.length,
    eventTotals,
  };
}

export function buildRuleBasedSummary(insights: BetaInsightsPayload): string[] {
  const bullets: string[] = [];
  const topDrop = insights.dropOffPoints[0];
  if (topDrop && topDrop.started > 0) {
    bullets.push(
      `${topDrop.dropOffRate}% of users stopped ${topDrop.label.toLowerCase()} (${topDrop.dropOffCount} of ${topDrop.started}).`
    );
  }
  if (insights.complaints[0]) {
    bullets.push(`Most common complaint: ${insights.complaints[0].theme}.`);
  }
  const voiceRequest = insights.complaints.find((c) => c.theme.includes("voice"));
  if (voiceRequest) {
    bullets.push(`Most requested feature: voice interviews (${voiceRequest.count} mentions).`);
  } else if (insights.complaints.find((c) => c.theme === "interview response time")) {
    bullets.push("Students frequently mention interview response time in feedback.");
  }
  if (insights.lowestRatedFeatures[0]) {
    bullets.push(
      `Lowest rated: ${insights.lowestRatedFeatures[0].feature} (${insights.lowestRatedFeatures[0].avgRating}/5).`
    );
  }
  if (insights.highestRatedFeatures[0]) {
    bullets.push(
      `Highest rated: ${insights.highestRatedFeatures[0].feature} (${insights.highestRatedFeatures[0].avgRating}/5).`
    );
  }
  bullets.push(
    `Interview completion rate: ${insights.completionMetrics.interviewCompletionRate}% · Coding: ${insights.completionMetrics.codingCompletionRate}%.`
  );
  if (insights.completionMetrics.placementReadinessChange !== 0) {
    const dir = insights.completionMetrics.placementReadinessChange > 0 ? "up" : "down";
    bullets.push(
      `Placement readiness trending ${dir} ${Math.abs(insights.completionMetrics.placementReadinessChange)} points vs prior half-period.`
    );
  }
  return bullets.slice(0, 7);
}

export async function getOrCreateWeeklySummary(
  forceRefresh = false,
  precomputed?: BetaInsightsPayload
) {
  const start = weekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const existing = await prisma.betaWeeklySummary.findUnique({
    where: { weekStart: start },
  });

  const stale =
    existing && Date.now() - existing.generatedAt.getTime() > 24 * 60 * 60 * 1000;

  if (existing && !forceRefresh && !stale) {
    return existing;
  }

  const insights = precomputed || (await computeBetaInsights(7));
  const { generateInsightsSummary } = await import("./beta-insights-ai");
  const { bullets, aiGenerated } = await generateInsightsSummary(insights);

  try {
    return await prisma.betaWeeklySummary.upsert({
      where: { weekStart: start },
      create: {
        weekStart: start,
        weekEnd: end,
        insights: insights as object,
        aiSummary: bullets,
        aiGenerated,
      },
      update: {
        insights: insights as object,
        aiSummary: bullets,
        aiGenerated,
        generatedAt: new Date(),
      },
    });
  } catch {
    return {
      id: "ephemeral",
      weekStart: start,
      weekEnd: end,
      insights: insights as object,
      aiSummary: bullets,
      aiGenerated,
      generatedAt: new Date(),
    };
  }
}

export async function listWeeklySummaries(limit = 8) {
  return prisma.betaWeeklySummary.findMany({
    orderBy: { weekStart: "desc" },
    take: limit,
  });
}

export { weekStart };
