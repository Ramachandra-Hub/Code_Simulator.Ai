export interface PlacementPredictionInput {
  placementReadiness: number;
  interviewReadiness: number;
  codingReadiness: number;
  professionalReadiness: number;
  learningVelocityScore: number;
  habitStreak: number;
  coachEngagement: number;
  weaknesses: string[];
  horizonDays: 30 | 60 | 90;
}

export interface PlacementPredictionResult {
  horizonDays: number;
  probability: number;
  confidence: number;
  improves: string[];
  reduces: string[];
  reasoning: string;
}

export function computePlacementPrediction(input: PlacementPredictionInput): PlacementPredictionResult {
  const base = input.placementReadiness;
  const horizonBoost =
    input.horizonDays === 30 ? 0 : input.horizonDays === 60 ? 8 : 15;
  const velocityBoost = input.learningVelocityScore * 0.15;
  const habitBoost = Math.min(12, input.habitStreak * 2);
  const coachBoost = Math.min(8, input.coachEngagement * 2);

  let probability = Math.min(
    95,
    Math.round(base * 0.55 + velocityBoost + habitBoost + coachBoost + horizonBoost)
  );

  if (input.interviewReadiness < 50) probability -= 10;
  if (input.codingReadiness < 50) probability -= 8;
  if (input.professionalReadiness < 45) probability -= 5;
  probability = Math.max(5, Math.min(95, probability));

  const improves: string[] = [];
  const reduces: string[] = [];

  if (input.codingReadiness < 70) improves.push("Daily coding practice (+8–15% probability)");
  if (input.interviewReadiness < 70) improves.push("Mock interviews 2×/week (+10% probability)");
  if (input.professionalReadiness < 65) improves.push("GitHub + LinkedIn optimization (+5% probability)");
  if (input.habitStreak < 5) improves.push("Build 7-day learning streak (+6% probability)");
  if (input.coachEngagement < 3) improves.push("Engage with AI Career Coach (+4% probability)");

  if (input.weaknesses.length > 3) reduces.push("Too many unresolved skill gaps dilute interview depth");
  if (input.habitStreak === 0) reduces.push("Inconsistent activity — velocity slowing");
  if (input.interviewReadiness < 45) reduces.push("Interview readiness below enterprise bar");

  return {
    horizonDays: input.horizonDays,
    probability,
    confidence: Math.min(0.92, 0.5 + input.placementReadiness / 200),
    improves,
    reduces,
    reasoning: `${input.horizonDays}-day placement probability ${probability}% based on Digital Twin readiness ${base}, learning velocity, and habits — not resume-only estimates.`,
  };
}
