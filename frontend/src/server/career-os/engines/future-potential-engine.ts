export interface FuturePotentialInput {
  placementReadiness: number;
  growthPotentialScore: number;
  learningVelocityScore: number;
  coachEngagement: number;
  projectActivity: number;
  consistencyScore: number;
  panelReadiness: number;
  strengths: string[];
}

export interface FuturePotentialResult {
  currentPotential: number;
  futurePotential: number;
  growthCeiling: number;
  leadershipPotential: number;
  technicalPotential: number;
  tier: string;
  reasoning: string[];
}

export function computeFuturePotential(input: FuturePotentialInput): FuturePotentialResult {
  const currentPotential = Math.round(
    input.placementReadiness * 0.35 +
      input.growthPotentialScore * 0.25 +
      input.learningVelocityScore * 0.2 +
      input.consistencyScore * 0.2
  );

  const growthMultiplier = 1 + (input.learningVelocityScore + input.coachEngagement * 10) / 200;
  const futurePotential = Math.min(98, Math.round(currentPotential * growthMultiplier + input.projectActivity * 0.1));

  const growthCeiling = Math.min(99, Math.round(futurePotential + input.growthPotentialScore * 0.15));
  const leadershipPotential = Math.round(
    input.panelReadiness * 0.4 + input.consistencyScore * 0.3 + (input.strengths.some((s) => /lead|team|stakeholder/i.test(s)) ? 15 : 0)
  );
  const technicalPotential = Math.round(
    input.placementReadiness * 0.3 + input.growthPotentialScore * 0.35 + input.projectActivity * 0.35
  );

  const tier =
    futurePotential >= 85 ? "exceptional" : futurePotential >= 70 ? "high" : futurePotential >= 55 ? "rising" : "developing";

  const reasoning: string[] = [];
  if (input.coachEngagement >= 3) reasoning.push("Coach engagement amplifies future trajectory");
  if (input.projectActivity >= 50) reasoning.push("Active projects raise technical ceiling");
  if (input.consistencyScore >= 60) reasoning.push("Consistency unlocks higher growth ceiling");

  return {
    currentPotential,
    futurePotential,
    growthCeiling,
    leadershipPotential,
    technicalPotential,
    tier,
    reasoning,
  };
}
