import { prisma } from "../../core/db/prisma";
import { AgentFactory } from "../../core/agent/agent-factory";
import { recordPlacementReadiness } from "./placement-readiness-service";

export async function computePlacementReadiness(userId: string) {
  const [latestInterview, latestResume, profile] = await Promise.all([
    prisma.interviewSession.findFirst({ where: { userId, status: "completed" }, orderBy: { completedAt: "desc" } }),
    prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { atsScores: { take: 1, orderBy: { createdAt: "desc" } } } }),
    prisma.studentIntelligenceProfile.findUnique({ where: { userId } }),
  ]);

  const resumeScore = latestResume?.atsScores[0]?.score || 70;
  const interviewScore = (latestInterview?.scores as { overall?: number })?.overall || 0;

  const agent = AgentFactory.create("placement-readiness");
  const result = await agent.run({ resumeScore, interviewScore }, { userId });
  const data = result.result as Record<string, unknown>;

  const skillGapAgent = AgentFactory.create("skill-gap");
  const gaps = await skillGapAgent.run({
    targetRole: latestResume?.targetRole || "Software Engineer",
    skills: profile?.strengths || [],
  }, { userId });

  return recordPlacementReadiness(userId, {
    source: "placement-service.compute",
    overallScore: (data.placementReadiness as number) || 0,
    interviewReadiness: interviewScore,
    codingReadiness: profile?.codingReadiness || 0,
    communicationScore: profile?.communicationScore || 0,
    skillGaps: gaps.result as Record<string, number>,
  });
}

export async function rankCandidates(driveId: string, candidateIds: string[]) {
  const candidates = await Promise.all(
    candidateIds.map(async (id) => {
      const readiness = await prisma.placementReadiness.findFirst({ where: { userId: id }, orderBy: { computedAt: "desc" } });
      return { id, score: readiness?.overallScore || 0 };
    })
  );

  const agent = AgentFactory.create("candidate-ranking");
  const result = await agent.run({ candidates });
  return result.result;
}

export async function createRecruiterPipeline(name: string, companyId?: string) {
  return prisma.recruiterPipeline.create({
    data: {
      name,
      companyId,
      stages: ["applied", "screening", "technical", "hr", "offer"],
      candidates: [],
    },
  });
}

export async function screenCandidate(userId: string) {
  const readiness = await prisma.placementReadiness.findFirst({ where: { userId }, orderBy: { computedAt: "desc" } });
  const agent = AgentFactory.create("recruiter-screening");
  return agent.run({ placementScore: readiness?.overallScore || 0 }, { userId });
}
