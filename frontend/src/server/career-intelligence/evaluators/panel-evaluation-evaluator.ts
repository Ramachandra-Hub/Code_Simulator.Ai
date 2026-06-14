export interface PanelistEvaluation {
  panelistId: string;
  name: string;
  role: string;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  hiringRecommendation: "strong_hire" | "hire" | "hold" | "no_hire";
  feedback: string;
}

export interface PanelModeratorReport {
  summary: string;
  overallRecommendation: "strong_hire" | "hire" | "hold" | "no_hire";
  strengths: string[];
  weaknesses: string[];
  panelEvaluations: PanelistEvaluation[];
  executiveCommunication: number;
  stakeholderManagement: number;
  pressureHandling: number;
  panelReadiness: number;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toRecommendation(avg: number): PanelistEvaluation["hiringRecommendation"] {
  if (avg >= 82) return "strong_hire";
  if (avg >= 68) return "hire";
  if (avg >= 50) return "hold";
  return "no_hire";
}

export function evaluatePanelistTurn(opts: {
  panelistId: string;
  name: string;
  role: string;
  persona: string;
  answer: string;
  answerScores: { technical?: number; communication?: number; confidence?: number; overall?: number };
  action: string;
}): PanelistEvaluation {
  const base = opts.answerScores.overall ?? 60;
  let comm = opts.answerScores.communication ?? base;
  let conf = opts.answerScores.confidence ?? base;
  let tech = opts.answerScores.technical ?? opts.answerScores.overall ?? base;

  if (opts.persona === "technical_lead") tech = clamp(tech * 1.05);
  if (opts.persona === "director" && opts.action === "challenge") conf = clamp(conf * 0.95);
  if (opts.persona === "hr" || opts.persona === "recruiter") comm = clamp(comm * 1.05);

  const avg = (tech + comm + conf) / 3;
  const rec = toRecommendation(avg);

  const feedback =
    rec === "strong_hire"
      ? `${opts.name}: Strong signal — clear, credible answer.`
      : rec === "hire"
        ? `${opts.name}: Solid response with room to deepen examples.`
        : rec === "hold"
          ? `${opts.name}: Mixed signal — needs more specificity.`
          : `${opts.name}: Concern — answer lacked depth or ownership.`;

  return {
    panelistId: opts.panelistId,
    name: opts.name,
    role: opts.role,
    technicalScore: clamp(tech),
    communicationScore: clamp(comm),
    confidenceScore: clamp(conf),
    hiringRecommendation: rec,
    feedback,
  };
}

export function buildModeratorReport(
  evaluations: PanelistEvaluation[],
  transcript: Array<{ speaker: string; role: string }>,
  interruptions: number
): PanelModeratorReport {
  const avgTech = evaluations.length
    ? evaluations.reduce((s, e) => s + e.technicalScore, 0) / evaluations.length
    : 50;
  const avgComm = evaluations.length
    ? evaluations.reduce((s, e) => s + e.communicationScore, 0) / evaluations.length
    : 50;
  const avgConf = evaluations.length
    ? evaluations.reduce((s, e) => s + e.confidenceScore, 0) / evaluations.length
    : 50;

  const directorEval = evaluations.find((e) => e.role.includes("Director"));
  const emEval = evaluations.find((e) => e.role.includes("Manager"));

  const executiveCommunication = clamp(avgComm * 0.6 + avgConf * 0.4);
  const stakeholderManagement = clamp((emEval?.communicationScore ?? avgComm) * 0.7 + (directorEval?.technicalScore ?? avgTech) * 0.3);
  const pressureHandling = clamp(avgConf - interruptions * 3 + 10);
  const panelReadiness = clamp((avgTech + avgComm + avgConf) / 3);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (avgComm >= 75) strengths.push("Executive-level communication under panel scrutiny");
  else weaknesses.push("Improve structured communication with multiple stakeholders");
  if (avgTech >= 75) strengths.push("Technically credible across panel depth");
  else weaknesses.push("Strengthen technical depth for senior panelists");
  if (pressureHandling >= 70) strengths.push("Handled pressure and interruptions well");
  else weaknesses.push("Practice composure when challenged or interrupted");
  if (stakeholderManagement >= 70) strengths.push("Demonstrated stakeholder awareness");
  else weaknesses.push("Articulate impact on teams and business stakeholders");

  const hireVotes = evaluations.filter((e) => e.hiringRecommendation === "hire" || e.hiringRecommendation === "strong_hire").length;
  const overallRecommendation: PanelModeratorReport["overallRecommendation"] =
    hireVotes >= 4 ? "strong_hire" : hireVotes >= 3 ? "hire" : hireVotes >= 2 ? "hold" : "no_hire";

  return {
    summary: `Panel completed with ${evaluations.length} panelist evaluations across ${transcript.filter((t) => t.role === "ai").length} questions. ${interruptions} interruption(s) during the session.`,
    overallRecommendation,
    strengths,
    weaknesses,
    panelEvaluations: evaluations,
    executiveCommunication,
    stakeholderManagement,
    pressureHandling,
    panelReadiness,
  };
}
