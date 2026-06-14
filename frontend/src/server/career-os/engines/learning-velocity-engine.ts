export type LearningVelocityTier = "slow" | "moderate" | "fast" | "exceptional";

export interface LearningVelocityResult {
  score: number;
  tier: LearningVelocityTier;
  skillGrowth: number;
  codingGrowth: number;
  interviewGrowth: number;
  professionalGrowth: number;
  reasoning: string[];
}

function tierFromScore(score: number): LearningVelocityTier {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "fast";
  if (score >= 40) return "moderate";
  return "slow";
}

/** CareerOS LearningVelocityScore — twin trend based */
export function computeLearningVelocity(input: {
  skillGrowth: number;
  codingGrowth: number;
  interviewGrowth: number;
  professionalGrowth: number;
  consistencyDays: number;
}): LearningVelocityResult {
  const factors = {
    skill: Math.max(0, input.skillGrowth),
    coding: Math.max(0, input.codingGrowth),
    interview: Math.max(0, input.interviewGrowth),
    professional: Math.max(0, input.professionalGrowth),
    consistency: Math.min(100, input.consistencyDays * 8),
  };

  const score = Math.round(
    factors.skill * 0.22 +
      factors.coding * 0.25 +
      factors.interview * 0.28 +
      factors.professional * 0.15 +
      factors.consistency * 0.1
  );

  const reasoning: string[] = [];
  if (factors.interview >= 15) reasoning.push("Interview skills accelerating");
  if (factors.coding >= 15) reasoning.push("Coding velocity increasing");
  if (factors.consistency >= 40) reasoning.push("Consistent daily learning habit");
  if (score < 40) reasoning.push("Increase daily missions to boost velocity");

  return {
    score: Math.min(100, score),
    tier: tierFromScore(score),
    skillGrowth: factors.skill,
    codingGrowth: factors.coding,
    interviewGrowth: factors.interview,
    professionalGrowth: factors.professional,
    reasoning,
  };
}
