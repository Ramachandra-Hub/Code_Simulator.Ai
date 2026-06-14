import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin } from "../memory/digital-twin";

export async function getTwin(userId: string) {
  const profile = await ensureDigitalTwin(userId);

  const [skillSignals, snapshots, latestPlacement, placementHistory, interviewCount, codingCount, codingInterviewCount, latestInterviews, latestCompletedInterview, atsScores] = await Promise.all([
    prisma.skillSignal.findMany({
      where: { profileId: profile.id },
      orderBy: { recordedAt: "desc" },
      take: 30,
    }),
    prisma.digitalTwinSnapshot.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.placementReadiness.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
    }),
    prisma.placementReadiness.findMany({
      where: { userId },
      orderBy: { computedAt: "asc" },
      take: 12,
    }),
    prisma.interviewSession.count({ where: { userId, status: "completed" } }),
    prisma.codeSubmission.count({ where: { userId } }),
    prisma.codingSession.count({ where: { userId, status: "completed" } }),
    prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { reportRecord: true },
    }),
    prisma.interviewSession.findFirst({
      where: { userId, status: "completed" },
      orderBy: { completedAt: "desc" },
    }),
    prisma.atsScore.findMany({
      where: { resume: { userId } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const interviewScores = latestCompletedInterview?.scores as { confidence?: number } | null;
  const confidenceScore = interviewScores?.confidence ?? Math.round((profile.communicationScore + profile.interviewReadiness) / 2);

  const sourceCounts: Record<string, number> = {};
  for (const sig of skillSignals) {
    sourceCounts[sig.source] = (sourceCounts[sig.source] || 0) + 1;
  }

  return {
    profile: {
      id: profile.id,
      placementScore: profile.placementScore,
      interviewReadiness: profile.interviewReadiness,
      codingReadiness: profile.codingReadiness,
      algorithmSkills: profile.algorithmSkills,
      problemSolving: profile.problemSolving,
      optimizationSkills: profile.optimizationSkills,
      communicationScore: profile.communicationScore,
      technicalScore: profile.technicalScore,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      confidenceScore,
      updatedAt: profile.updatedAt.toISOString(),
    },
    metrics: {
      algorithmSkills: profile.algorithmSkills,
      problemSolving: profile.problemSolving,
      optimizationSkills: profile.optimizationSkills,
      communication: profile.communicationScore,
      technical: profile.technicalScore,
      confidence: confidenceScore,
      interviewReadiness: profile.interviewReadiness,
      placementReadiness: profile.placementScore,
      codingReadiness: profile.codingReadiness,
    },
    trends: {
      placement: placementHistory.map((p) => ({
        date: p.computedAt.toISOString(),
        overall: p.overallScore,
        interview: p.interviewReadiness,
        coding: p.codingReadiness,
        communication: p.communicationScore,
      })),
      snapshots: snapshots.slice(0, 8).map((s) => {
        const d = (s.data as Record<string, unknown>) || {};
        const derived = (d.derivedUpdates as Record<string, number>) || {};
        return {
          date: s.createdAt.toISOString(),
          trigger: s.trigger,
          placementScore: derived.placementScore ?? null,
          codingReadiness: derived.codingReadiness ?? null,
        };
      }),
    },
    placementReadiness: latestPlacement
      ? {
          overallScore: latestPlacement.overallScore,
          interviewReadiness: latestPlacement.interviewReadiness,
          codingReadiness: latestPlacement.codingReadiness,
          communicationScore: latestPlacement.communicationScore,
          skillGaps: latestPlacement.skillGaps,
          computedAt: latestPlacement.computedAt.toISOString(),
        }
      : null,
    activity: {
      interviews: interviewCount,
      codingSubmissions: codingCount,
      codingInterviews: codingInterviewCount,
      sources: sourceCounts,
    },
    skillSignals: skillSignals.map((s) => ({
      id: s.id,
      skill: s.skill,
      level: s.level,
      source: s.source,
      recordedAt: s.recordedAt.toISOString(),
    })),
    snapshots: snapshots.map((s) => ({
      id: s.id,
      trigger: s.trigger,
      data: s.data,
      createdAt: s.createdAt.toISOString(),
    })),
    recentInterviews: latestInterviews.map((s) => ({
      id: s.id,
      type: s.type,
      status: s.status,
      targetRole: s.targetRole,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() || null,
      placementReadiness: s.reportRecord?.placementReadiness || null,
      interviewScore: s.reportRecord?.interviewScore || null,
    })),
    recentAts: atsScores.map((s) => ({
      score: s.score,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export type TwinPayload = Awaited<ReturnType<typeof getTwin>>;
