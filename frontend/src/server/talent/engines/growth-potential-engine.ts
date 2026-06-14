export type GrowthTier = "low" | "medium" | "high" | "exceptional";

export interface GrowthPotentialInput {
  interviewTrend: number;
  codingTrend: number;
  roadmapCompletion: number;
  githubGrowth: number;
  coachEngagement: number;
  learningConsistency: number;
}

export interface GrowthPotentialResult {
  score: number;
  tier: GrowthTier;
  factors: Record<string, number>;
  reasoning: string[];
}

function tierFromScore(score: number): GrowthTier {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** GrowthPotentialScore = weighted improvement signals (not resume history) */
export function computeGrowthPotential(input: GrowthPotentialInput): GrowthPotentialResult {
  const factors = {
    interviewImprovement: Math.min(100, Math.max(0, input.interviewTrend)),
    codingImprovement: Math.min(100, Math.max(0, input.codingTrend)),
    roadmapCompletion: Math.min(100, Math.max(0, input.roadmapCompletion)),
    githubGrowth: Math.min(100, Math.max(0, input.githubGrowth)),
    coachEngagement: Math.min(100, Math.max(0, input.coachEngagement)),
    learningConsistency: Math.min(100, Math.max(0, input.learningConsistency)),
  };

  const score = Math.round(
    factors.interviewImprovement * 0.22 +
      factors.codingImprovement * 0.2 +
      factors.roadmapCompletion * 0.18 +
      factors.githubGrowth * 0.12 +
      factors.coachEngagement * 0.15 +
      factors.learningConsistency * 0.13
  );

  const reasoning: string[] = [];
  if (factors.interviewImprovement >= 60) reasoning.push("Strong interview improvement trajectory");
  if (factors.codingImprovement >= 60) reasoning.push("Coding skills accelerating");
  if (factors.roadmapCompletion >= 50) reasoning.push("Actively completing career roadmap");
  if (factors.coachEngagement >= 50) reasoning.push("Engaged with AI career coach");
  if (factors.learningConsistency >= 50) reasoning.push("Consistent platform learning activity");
  if (score < 40) reasoning.push("Limited growth signals — coaching recommended");

  return { score, tier: tierFromScore(score), factors, reasoning };
}
