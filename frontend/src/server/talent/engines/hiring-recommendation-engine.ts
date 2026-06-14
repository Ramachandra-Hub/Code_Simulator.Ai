export type HiringDecisionLabel =
  | "strong_hire"
  | "hire"
  | "borderline"
  | "needs_coaching"
  | "do_not_hire";

export interface HiringRecommendationInput {
  overallMatch?: number;
  placementReadiness: number;
  growthPotentialScore: number;
  careerVelocityScore: number;
  panelReadiness: number;
  professionalReadiness: number;
  twinStrengths: string[];
  twinWeaknesses: string[];
}

export interface HiringRecommendationResult {
  decision: HiringDecisionLabel;
  confidence: number;
  reasoning: string;
  highlights: string[];
  risks: string[];
}

export function computeHiringRecommendation(input: HiringRecommendationInput): HiringRecommendationResult {
  const composite = Math.round(
    input.placementReadiness * 0.3 +
      (input.overallMatch ?? input.placementReadiness) * 0.25 +
      input.growthPotentialScore * 0.2 +
      input.careerVelocityScore * 0.1 +
      input.panelReadiness * 0.08 +
      input.professionalReadiness * 0.07
  );

  let decision: HiringDecisionLabel;
  if (composite >= 82 && input.growthPotentialScore >= 65) decision = "strong_hire";
  else if (composite >= 68) decision = "hire";
  else if (composite >= 52) decision = "borderline";
  else if (composite >= 38 || input.growthPotentialScore >= 55) decision = "needs_coaching";
  else decision = "do_not_hire";

  const highlights = [...input.twinStrengths].slice(0, 4);
  const risks = [...input.twinWeaknesses].slice(0, 4);
  if (input.growthPotentialScore >= 70) highlights.push("High growth potential — invest in development");
  if (input.careerVelocityScore >= 65) highlights.push("Accelerating career velocity");
  if (input.panelReadiness < 50) risks.push("Panel readiness below enterprise bar");

  const reasoning = `Composite talent score ${composite}/100 based on Digital Twin signals (not resume-only). Placement ${input.placementReadiness}, growth ${input.growthPotentialScore}, velocity ${input.careerVelocityScore}. Recommendation: ${decision.replace(/_/g, " ")}.`;

  return {
    decision,
    confidence: Math.min(0.95, 0.55 + composite / 200),
    reasoning,
    highlights,
    risks,
  };
}
