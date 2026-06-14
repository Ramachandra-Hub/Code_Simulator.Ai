import { prisma } from "../../core/db/prisma";
import { AgentFactory } from "../../core/agent/agent-factory";

export async function getStudentAnalytics(userId: string) {
  const [interviews, resumes, profile, readiness] = await Promise.all([
    prisma.interviewSession.findMany({ where: { userId, status: "completed" }, take: 10 }),
    prisma.resume.findMany({ where: { userId }, take: 5 }),
    prisma.studentIntelligenceProfile.findUnique({ where: { userId }, include: { skillSignals: { take: 20 } } }),
    prisma.placementReadiness.findFirst({ where: { userId }, orderBy: { computedAt: "desc" } }),
  ]);

  const avgInterviewScore = interviews.length
    ? Math.round(interviews.reduce((s, i) => s + ((i.scores as { overall?: number })?.overall || 0), 0) / interviews.length)
    : 0;

  return {
    interviewsCompleted: interviews.length,
    avgInterviewScore,
    resumesCount: resumes.length,
    placementReadiness: readiness?.overallScore || profile?.placementScore || 0,
    skillSignals: profile?.skillSignals || [],
    strengths: profile?.strengths || [],
    weaknesses: profile?.weaknesses || [],
  };
}

export async function getCollegeAnalytics(collegeId: string) {
  const users = await prisma.user.findMany({ where: { collegeId }, select: { id: true } });
  const userIds = users.map((u) => u.id);

  const [interviews, readiness] = await Promise.all([
    prisma.interviewSession.count({ where: { userId: { in: userIds }, status: "completed" } }),
    prisma.placementReadiness.findMany({ where: { userId: { in: userIds } }, take: 100 }),
  ]);

  const avgReadiness = readiness.length
    ? readiness.reduce((s, r) => s + r.overallScore, 0) / readiness.length
    : 0;

  const agent = AgentFactory.create("college-analytics");
  const insights = await agent.run({ metrics: { students: users.length, interviews, avgReadiness } });

  return { students: users.length, interviewsCompleted: interviews, avgPlacementReadiness: Math.round(avgReadiness), insights: insights.result };
}

export async function getPlacementAnalytics() {
  const agent = AgentFactory.create("placement-analytics");
  const result = await agent.run({});
  return result.result;
}

export async function generateInsights(scope: string, scopeId?: string) {
  const insight = await prisma.insight.create({
    data: {
      scope,
      scopeId,
      title: "Action Required",
      content: "Increase mock interview participation to improve placement readiness scores.",
      priority: 1,
    },
  });
  return insight;
}
