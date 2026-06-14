import { createHash } from "crypto";

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function questionKey(text: string, interviewType?: string): string {
  const base = normalizeText(text);
  const hash = createHash("sha256").update(base).digest("hex").slice(0, 16);
  return interviewType ? `${interviewType}:${hash}` : hash;
}

export function titleKey(title: string): string {
  const base = normalizeText(title);
  return createHash("sha256").update(base).digest("hex").slice(0, 20);
}

export function engagementFromAnswer(answer: string): number {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  if (words >= 80) return 100;
  if (words >= 40) return 85;
  if (words >= 20) return 70;
  if (words >= 10) return 55;
  return 30;
}

export function computeQuestionEffectiveness(input: {
  timesAsked: number;
  timesAnswered: number;
  timesSkipped: number;
  timesAbandoned: number;
  followUpCount: number;
  followUpImproved: number;
  avgScore: number;
  avgEngagement: number;
  avgRatingImpact: number;
}): number {
  const asked = Math.max(input.timesAsked, 1);
  const completionRate = input.timesAnswered / asked;
  const abandonRate = input.timesAbandoned / asked;
  const followUpRate = input.followUpCount > 0 ? input.followUpImproved / input.followUpCount : 0.5;
  const score =
    completionRate * 35 +
    (input.avgScore / 100) * 30 +
    (input.avgEngagement / 100) * 15 +
    followUpRate * 10 +
    (input.avgRatingImpact / 5) * 5 -
    abandonRate * 15;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function computeRecommendationEffectiveness(input: {
  timesShown: number;
  timesAccepted: number;
  timesCompleted: number;
  timesIgnored: number;
  avgPlacementDelta: number;
  avgRating: number;
}): number {
  const shown = Math.max(input.timesShown, 1);
  const adoption = input.timesAccepted / shown;
  const completion = input.timesCompleted / shown;
  const ignorePenalty = input.timesIgnored / shown;
  const placementBoost = Math.min(20, Math.max(-20, input.avgPlacementDelta)) / 20;
  const ratingBoost = input.avgRating > 0 ? (input.avgRating - 3) / 2 : 0;
  const score =
    adoption * 35 +
    completion * 25 +
    (placementBoost + 1) * 12.5 +
    (ratingBoost + 1) * 12.5 -
    ignorePenalty * 20;
  return Math.round(Math.min(100, Math.max(0, score)));
}
