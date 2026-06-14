import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin } from "../memory/digital-twin";
import { runCareerCoachGraph } from "../workflows/career-coach-graph";
import type { StudentCoachContext } from "./career-coach-types";

export type { StudentCoachContext };

export async function gatherStudentCoachContext(userId: string): Promise<StudentCoachContext> {
  const profile = await ensureDigitalTwin(userId);

  const [
    resume,
    latestInterview,
    interviewReports,
    codingSessions,
    githubSnap,
    linkedinSnap,
    leetcodeStats,
    hackerrankStats,
    githubInt,
    linkedinInt,
  ] = await Promise.all([
      prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: { atsScores: { take: 1, orderBy: { createdAt: "desc" } } },
      }),
      prisma.interviewSession.findFirst({
        where: { userId, status: "completed" },
        orderBy: { completedAt: "desc" },
        include: { reportRecord: true },
      }),
      prisma.interviewReport.findMany({
        where: { session: { userId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { session: { select: { id: true, type: true } } },
      }),
      prisma.codingSession.findMany({
        where: { userId, status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 5,
        include: { evaluations: { take: 1, orderBy: { createdAt: "desc" } } },
      }),
      prisma.githubSnapshot.findFirst({ where: { userId }, orderBy: { analyzedAt: "desc" } }),
      prisma.linkedInSnapshot.findFirst({ where: { userId }, orderBy: { analyzedAt: "desc" } }),
      prisma.leetCodeStats.findFirst({ where: { userId }, orderBy: { syncedAt: "desc" } }),
      prisma.hackerRankStats.findFirst({ where: { userId }, orderBy: { syncedAt: "desc" } }),
      prisma.integrationAccount.findUnique({ where: { userId_provider: { userId, provider: "github" } } }),
      prisma.integrationAccount.findUnique({ where: { userId_provider: { userId, provider: "linkedin" } } }),
    ]);

  const resumeScore = resume?.atsScores[0]?.score ?? 0;
  const interviewScores = latestInterview?.scores as { overall?: number; confidence?: number } | null;
  const latestInterviewScore = interviewScores?.overall ?? latestInterview?.reportRecord?.interviewScore ?? 0;
  const confidenceScore =
    interviewScores?.confidence ??
    Math.round((profile.communicationScore + profile.interviewReadiness) / 2);

  const latestCoding = codingSessions[0]?.evaluations[0];
  const latestCodingScore = latestCoding?.overallScore ?? codingSessions[0]?.score ?? profile.codingReadiness;

  return {
    profile,
    targetRole: resume?.targetRole || latestInterview?.targetRole || "Software Engineer",
    resumeScore,
    latestInterviewScore,
    confidenceScore,
    latestCodingScore,
    interviewReports: interviewReports.map((r) => ({
      sessionId: r.sessionId,
      type: r.session.type,
      interviewScore: r.interviewScore,
      placementReadiness: r.placementReadiness,
      strengths: r.strengths,
      improvements: r.improvements,
    })),
    codingEvaluations: codingSessions.map((s) => ({
      sessionId: s.id,
      overallScore: s.evaluations[0]?.overallScore ?? s.score ?? 0,
      verdict: s.evaluations[0]?.verdict ?? null,
      timeComplexity: s.evaluations[0]?.timeComplexity ?? null,
    })),
    resumeAnalysis: resume?.atsScores[0]
      ? { atsScore: resume.atsScores[0].score, feedback: resume.atsScores[0].feedback }
      : null,
    githubSummary: githubSnap
      ? `GitHub score ${githubSnap.score ?? 0}/100, stars: ${githubSnap.stars ?? 0}, repos analyzed`
      : githubInt
        ? "GitHub connected — sync for analysis"
        : "No GitHub data",
    linkedinSummary: linkedinSnap
      ? `LinkedIn score ${linkedinSnap.score ?? 0}/100, headline: ${linkedinSnap.headline || "—"}, skills: ${linkedinSnap.skills.length}`
      : linkedinInt
        ? "LinkedIn connected — sync for analysis"
        : "No LinkedIn data",
    leetcodeSummary: leetcodeStats
      ? `LeetCode: ${leetcodeStats.solved} solved (E${leetcodeStats.easy}/M${leetcodeStats.medium}/H${leetcodeStats.hard}), score ${leetcodeStats.score ?? 0}`
      : "No LeetCode data — connect username to sync",
    hackerrankSummary: hackerrankStats
      ? `HackerRank score ${hackerrankStats.score ?? 0}, badges and certifications synced`
      : "No HackerRank data — connect username to sync",
    professionalScores: {
      githubScore: profile.githubScore,
      linkedinScore: profile.linkedinScore,
      leetcodeScore: profile.leetcodeScore,
      hackerrankScore: profile.hackerrankScore,
      professionalReadiness: profile.professionalReadiness,
      portfolioStrength: profile.portfolioStrength,
    },
  };
}

export async function runCareerCoach(userId: string) {
  const context = await gatherStudentCoachContext(userId);
  const result = await runCareerCoachGraph(userId, context);

  const priorPlacement = await prisma.placementReadiness.findFirst({
    where: { userId },
    orderBy: { computedAt: "desc" },
  });
  const placementBefore = priorPlacement?.overallScore ?? null;
  const batchId = `coach-${Date.now()}`;

  await prisma.recommendation.deleteMany({ where: { userId, type: "career_coach" } });
  await prisma.recommendation.createMany({
    data: result.recommendations.recommendations.map((r, i) => ({
      userId,
      type: "career_coach",
      title: r.title,
      description: r.description,
      priority: r.priority === "high" ? 10 : r.priority === "medium" ? 5 : 2,
      status: "active",
    })),
  });

  const createdRecs = await prisma.recommendation.findMany({
    where: { userId, type: "career_coach" },
    orderBy: { priority: "desc" },
  });
  const { recordRecommendationsShown, measurePlacementImprovement } = await import(
    "../../intelligence/recommendation-intelligence-service"
  );
  void recordRecommendationsShown(userId, createdRecs, placementBefore, batchId);

  const existingRoadmap = await prisma.careerRoadmap.findFirst({
    where: { userId, targetRole: context.targetRole },
    orderBy: { updatedAt: "desc" },
  });

  let roadmapRecord;
  if (existingRoadmap) {
    await prisma.roadmapItem.deleteMany({ where: { roadmapId: existingRoadmap.id } });
    roadmapRecord = await prisma.careerRoadmap.update({
      where: { id: existingRoadmap.id },
      data: { title: result.roadmap.title },
    });
  } else {
    roadmapRecord = await prisma.careerRoadmap.create({
      data: { userId, title: result.roadmap.title, targetRole: context.targetRole },
    });
  }

  await prisma.roadmapItem.createMany({
    data: result.roadmap.items.map((item) => ({
      roadmapId: roadmapRecord.id,
      title: item.title,
      type: item.type,
      priority: item.priority,
      status: "pending",
    })),
  });

  const { recordPlacementReadiness } = await import("./placement-readiness-service");
  await recordPlacementReadiness(userId, {
    source: "career-coach",
    overallScore: result.placement.placementReadiness,
    interviewReadiness: result.analysis.metrics.interviewReadiness,
    codingReadiness: result.analysis.metrics.codingReadiness,
    communicationScore: result.analysis.metrics.communication,
    skillGaps: result.analysis.skillGaps as Record<string, number>,
    roadmap: result.roadmap,
  });

  await prisma.studentIntelligenceProfile.update({
    where: { userId },
    data: {
      strengths: result.recommendations.strengths.slice(0, 12),
      weaknesses: result.recommendations.weaknesses.slice(0, 12),
    },
  });

  void measurePlacementImprovement(userId, result.placement.placementReadiness);

  return {
    analysis: result.analysis,
    recommendations: result.recommendations,
    roadmap: result.roadmap,
    placement: result.placement,
    targetRole: context.targetRole,
    source: {
      metrics: "heuristic",
      recommendations: result.recommendations.source,
      roadmap: result.roadmap.source,
      placement: result.placement.source,
    },
  };
}

export async function getCareerCoachResults(userId: string) {
  const [recommendations, roadmap, latestPlacement] = await Promise.all([
    prisma.recommendation.findMany({
      where: { userId, type: "career_coach" },
      orderBy: { priority: "desc" },
    }),
    prisma.careerRoadmap.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { items: { orderBy: { priority: "asc" } } },
    }),
    prisma.placementReadiness.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
    }),
  ]);

  const profile = await prisma.studentIntelligenceProfile.findUnique({ where: { userId } });

  return {
    profile: profile
      ? {
          strengths: profile.strengths,
          weaknesses: profile.weaknesses,
          placementScore: profile.placementScore,
        }
      : null,
    recommendations,
    roadmap,
    placementReadiness: latestPlacement,
  };
}
