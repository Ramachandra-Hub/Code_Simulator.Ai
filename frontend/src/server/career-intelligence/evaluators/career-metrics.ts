import type { StudentIntelligenceProfile } from "@prisma/client";

export interface HeuristicCareerAnalysis {
  metrics: Record<string, number>;
  skillGaps: Record<string, number>;
  weaknesses: string[];
  strengths: string[];
  placementScore: number;
  source: "heuristic";
}

const TARGET = 70;

export function analyzeStudentHeuristic(
  profile: StudentIntelligenceProfile,
  extras?: {
    resumeScore?: number;
    interviewScore?: number;
    confidenceScore?: number;
    codingScore?: number;
  }
): HeuristicCareerAnalysis {
  const metrics: Record<string, number> = {
    placementReadiness: profile.placementScore,
    interviewReadiness: profile.interviewReadiness,
    codingReadiness: profile.codingReadiness,
    algorithmSkills: profile.algorithmSkills,
    problemSolving: profile.problemSolving,
    optimizationSkills: profile.optimizationSkills,
    communication: profile.communicationScore,
    technical: profile.technicalScore,
    confidence: extras?.confidenceScore ?? Math.round((profile.communicationScore + profile.interviewReadiness) / 2),
    resumeScore: extras?.resumeScore ?? 0,
    interviewScore: extras?.interviewScore ?? profile.interviewReadiness,
    codingScore: extras?.codingScore ?? profile.codingReadiness,
  };

  const skillGaps: Record<string, number> = {};
  const gapFields: Array<[string, number]> = [
    ["coding", metrics.codingReadiness],
    ["interview", metrics.interviewReadiness],
    ["communication", metrics.communication],
    ["technical", metrics.technical],
    ["algorithms", metrics.algorithmSkills],
    ["problem_solving", metrics.problemSolving],
    ["optimization", metrics.optimizationSkills],
    ["confidence", metrics.confidence],
  ];

  for (const [key, val] of gapFields) {
    if (val < TARGET) skillGaps[key] = Math.round(TARGET - val);
  }

  const weaknesses = [...profile.weaknesses];
  if (metrics.codingReadiness < TARGET) weaknesses.push("Coding readiness below placement threshold");
  if (metrics.interviewReadiness < TARGET) weaknesses.push("Interview performance needs improvement");
  if (metrics.communication < TARGET) weaknesses.push("Communication clarity needs work");
  if (metrics.algorithmSkills < TARGET) weaknesses.push("Algorithm fundamentals need practice");
  if (metrics.confidence < TARGET) weaknesses.push("Interview confidence is low");

  const strengths = [...profile.strengths];
  if (metrics.codingReadiness >= 80) strengths.push("Strong coding readiness");
  if (metrics.interviewReadiness >= 80) strengths.push("Strong interview readiness");
  if (metrics.communication >= 80) strengths.push("Clear communication");

  return {
    metrics,
    skillGaps,
    weaknesses: Array.from(new Set(weaknesses)).slice(0, 10),
    strengths: Array.from(new Set(strengths)).slice(0, 10),
    placementScore: profile.placementScore,
    source: "heuristic",
  };
}

export function computePlacementHeuristic(metrics: Record<string, number>): {
  placementReadiness: number;
  hiringProbability: string;
} {
  const prof = metrics.professionalReadiness ?? 0;
  const profWeight = prof > 0 ? 0.15 : 0;
  const baseWeight = 1 - profWeight;
  const score = Math.round(
  (metrics.interviewReadiness * 0.3 +
      metrics.codingReadiness * 0.25 +
      metrics.technical * 0.2 +
      metrics.communication * 0.15 +
      metrics.confidence * 0.1) *
      baseWeight +
      prof * profWeight
  );
  return {
    placementReadiness: score,
    hiringProbability: score >= 80 ? "Very High" : score >= 65 ? "High" : score >= 50 ? "Moderate" : "Developing",
  };
}
