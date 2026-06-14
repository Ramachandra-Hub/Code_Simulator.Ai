export interface PerformanceInputs {
  standupAvg: { communication: number; ownership: number; professionalism: number };
  taskCompletionRate: number;
  codeReviewAvg: number;
  meetingParticipation: number;
  twin: {
    technicalScore: number;
    communicationScore: number;
    leadershipScore: number;
    ownershipScore: number;
    collaborationScore: number;
    stakeholderManagement: number;
  };
}

export interface PerformanceDimensions {
  technical: number;
  communication: number;
  ownership: number;
  leadership: number;
  collaboration: number;
  promotionReady: number;
  summary: string;
}

export function computePerformanceReview(period: "weekly" | "monthly", inputs: PerformanceInputs): PerformanceDimensions {
  const weight = period === "monthly" ? 1 : 0.85;
  const s = inputs.standupAvg;

  const technical = Math.round(
    (inputs.twin.technicalScore * 0.4 + inputs.codeReviewAvg * 0.35 + inputs.taskCompletionRate * 0.25) * weight
  );
  const communication = Math.round(
    (s.communication * 0.35 + inputs.twin.communicationScore * 0.35 + inputs.meetingParticipation * 0.3) * weight
  );
  const ownership = Math.round((s.ownership * 0.45 + inputs.twin.ownershipScore * 0.35 + inputs.taskCompletionRate * 0.2) * weight);
  const leadership = Math.round(
    (inputs.twin.leadershipScore * 0.5 + s.professionalism * 0.25 + inputs.meetingParticipation * 0.25) * weight
  );
  const collaboration = Math.round(
    (inputs.twin.collaborationScore * 0.4 + s.communication * 0.3 + inputs.meetingParticipation * 0.3) * weight
  );
  const promotionReady = Math.round(
    (technical * 0.25 + communication * 0.15 + ownership * 0.2 + leadership * 0.15 + collaboration * 0.15 + inputs.twin.stakeholderManagement * 0.1) *
      (period === "monthly" ? 1.05 : 1)
  );

  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const dims = {
    technical: clamp(technical),
    communication: clamp(communication),
    ownership: clamp(ownership),
    leadership: clamp(leadership),
    collaboration: clamp(collaboration),
    promotionReady: clamp(promotionReady),
  };

  const summary =
    dims.promotionReady >= 75
      ? `${period === "monthly" ? "Monthly" : "Weekly"} review: Strong performer. On track for promotion discussion.`
      : dims.promotionReady >= 60
        ? `${period === "monthly" ? "Monthly" : "Weekly"} review: Solid contributor. Focus on ownership and cross-team visibility.`
        : `${period === "monthly" ? "Monthly" : "Weekly"} review: Developing. Prioritize task completion and clearer communication.`;

  return { ...dims, summary };
}

export function assessPromotion(dims: PerformanceDimensions): { ready: boolean; score: number; gaps: string[]; recommendation: string } {
  const score = dims.promotionReady;
  const gaps: string[] = [];
  if (dims.technical < 70) gaps.push("technical depth");
  if (dims.ownership < 65) gaps.push("ownership");
  if (dims.leadership < 60) gaps.push("leadership visibility");
  if (dims.collaboration < 65) gaps.push("collaboration");

  const ready = score >= 72 && gaps.length <= 1;
  const recommendation = ready
    ? "Promotion-ready profile. Schedule calibration with HR and engineering leadership."
    : `Not yet promotion-ready. Close gaps in: ${gaps.join(", ") || "consistency"}.`;

  return { ready, score, gaps, recommendation };
}
