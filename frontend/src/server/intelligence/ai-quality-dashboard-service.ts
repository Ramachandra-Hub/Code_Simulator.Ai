import { prisma } from "../core/db/prisma";
import { getInterviewQualityMetrics, getTopQuestions } from "./question-intelligence-service";
import { getCoachQualityMetrics, getTopRecommendations } from "./recommendation-intelligence-service";

export async function getAiQualityDashboard(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    interviewQuality,
    coachQuality,
    bestQuestions,
    worstQuestions,
    bestRecommendations,
    worstRecommendations,
    placementTrend,
  ] = await Promise.all([
    getInterviewQualityMetrics(days),
    getCoachQualityMetrics(days),
    getTopQuestions(5, "desc"),
    getTopQuestions(5, "asc"),
    getTopRecommendations(5, "desc"),
    getTopRecommendations(5, "asc"),
    prisma.placementReadiness.findMany({
      where: { computedAt: { gte: since } },
      select: { overallScore: true, computedAt: true, userId: true },
      orderBy: { computedAt: "asc" },
    }),
  ]);

  const byDay = new Map<string, { total: number; count: number }>();
  for (const p of placementTrend) {
    const day = p.computedAt.toISOString().slice(0, 10);
    const b = byDay.get(day) || { total: 0, count: 0 };
    b.total += p.overallScore;
    b.count += 1;
    byDay.set(day, b);
  }

  const studentImprovementTrend = [...byDay.entries()].map(([date, v]) => ({
    date,
    avgPlacement: Math.round(v.total / v.count),
  }));

  const userScores = new Map<string, number[]>();
  for (const p of placementTrend) {
    const arr = userScores.get(p.userId) || [];
    arr.push(p.overallScore);
    userScores.set(p.userId, arr);
  }
  let improving = 0;
  let declining = 0;
  for (const scores of userScores.values()) {
    if (scores.length < 2) continue;
    const delta = scores[scores.length - 1] - scores[0];
    if (delta > 2) improving += 1;
    else if (delta < -2) declining += 1;
  }

  return {
    period: { days, start: since.toISOString() },
    interviewQuality,
    coachQuality,
    bestQuestions: bestQuestions.map(formatQuestion),
    worstQuestions: worstQuestions.filter((q) => q.timesAsked >= 1).map(formatQuestion),
    bestRecommendations: bestRecommendations.map(formatRecommendation),
    worstRecommendations: worstRecommendations.filter((r) => r.timesShown >= 1).map(formatRecommendation),
    studentImprovement: {
      improving,
      declining,
      stable: userScores.size - improving - declining,
      trend: studentImprovementTrend,
    },
  };
}

function formatQuestion(q: {
  questionText: string;
  interviewType: string | null;
  effectivenessScore: number;
  timesAsked: number;
  timesAnswered: number;
  timesAbandoned: number;
}) {
  return {
    question: q.questionText.slice(0, 120),
    type: q.interviewType,
    score: q.effectivenessScore,
    asked: q.timesAsked,
    answered: q.timesAnswered,
    abandoned: q.timesAbandoned,
    completionRate: q.timesAsked > 0 ? Math.round((q.timesAnswered / q.timesAsked) * 100) : 0,
  };
}

function formatRecommendation(r: {
  title: string;
  category: string | null;
  effectivenessScore: number;
  timesShown: number;
  timesAccepted: number;
  timesIgnored: number;
  timesCompleted: number;
}) {
  return {
    title: r.title,
    category: r.category,
    score: r.effectivenessScore,
    shown: r.timesShown,
    accepted: r.timesAccepted,
    ignored: r.timesIgnored,
    completed: r.timesCompleted,
    adoptionRate: r.timesShown > 0 ? Math.round((r.timesAccepted / r.timesShown) * 100) : 0,
  };
}
