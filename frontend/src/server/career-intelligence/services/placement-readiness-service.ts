import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin } from "../memory/digital-twin";
import { computePlacementHeuristic } from "../evaluators/career-metrics";

export interface PlacementReadinessInput {
  source: string;
  overallScore?: number;
  interviewReadiness?: number;
  codingReadiness?: number;
  communicationScore?: number;
  technicalScore?: number;
  confidenceScore?: number;
  skillGaps?: Record<string, number>;
  roadmap?: object;
  resumeScore?: number;
}

/**
 * Single writer for PlacementReadiness records (PR-5.7).
 * All modules must publish events / call this service — no direct prisma writes elsewhere.
 */
export async function recordPlacementReadiness(userId: string, input: PlacementReadinessInput) {
  const profile = await ensureDigitalTwin(userId);

  const metrics: Record<string, number> = {
    interviewReadiness: input.interviewReadiness ?? profile.interviewReadiness,
    codingReadiness: input.codingReadiness ?? profile.codingReadiness,
    technical: input.technicalScore ?? profile.technicalScore,
    communication: input.communicationScore ?? profile.communicationScore,
    professionalReadiness: profile.professionalReadiness,
    confidence:
      input.confidenceScore ??
      Math.round((profile.communicationScore + profile.interviewReadiness) / 2),
  };

  const computed = computePlacementHeuristic(metrics);
  const overallScore = input.overallScore ?? computed.placementReadiness;

  const skillGaps = input.skillGaps ?? buildSkillGapsFromProfile(profile);

  const record = await prisma.placementReadiness.create({
    data: {
      userId,
      overallScore,
      interviewReadiness: metrics.interviewReadiness,
      codingReadiness: metrics.codingReadiness,
      communicationScore: metrics.communication,
      skillGaps: skillGaps as object,
      roadmap: input.roadmap as object | undefined,
      companyReadiness: { source: input.source, hiringProbability: computed.hiringProbability } as object,
    },
  });

  await prisma.studentIntelligenceProfile.update({
    where: { userId },
    data: { placementScore: overallScore },
  });

  return record;
}

function buildSkillGapsFromProfile(profile: {
  codingReadiness: number;
  communicationScore: number;
  technicalScore: number;
  interviewReadiness: number;
}): Record<string, number> {
  const gaps: Record<string, number> = {};
  const TARGET = 70;
  if (profile.codingReadiness < TARGET) gaps.coding = Math.round(TARGET - profile.codingReadiness);
  if (profile.communicationScore < TARGET) gaps.communication = Math.round(TARGET - profile.communicationScore);
  if (profile.technicalScore < TARGET) gaps.technical = Math.round(TARGET - profile.technicalScore);
  if (profile.interviewReadiness < TARGET) gaps.interview = Math.round(TARGET - profile.interviewReadiness);
  return gaps;
}

export async function getLatestPlacementReadiness(userId: string) {
  return prisma.placementReadiness.findFirst({
    where: { userId },
    orderBy: { computedAt: "desc" },
  });
}
