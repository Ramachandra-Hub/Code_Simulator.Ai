import type { InterviewSession } from "./interview-types";
import { apiFetch } from "./api-client";

export async function fetchInterviewSessionsAsync(): Promise<InterviewSession[]> {
  const sessions = await apiFetch<Record<string, unknown>[]>("/interviews");
  return sessions.map(mapDbSession);
}

export async function createInterviewSessionAsync(type: string, resumeId?: string): Promise<string | null> {
  try {
    const session = await apiFetch<{ id: string }>("/interviews", {
      method: "POST",
      body: JSON.stringify({ type, resumeId }),
    });
    return session.id;
  } catch {
    return null;
  }
}

function mapDbSession(s: Record<string, unknown>): InterviewSession {
  const reportRecord = (s.reportRecord as Record<string, unknown>) || {};
  const report = (s.report as Record<string, unknown>) || reportRecord;
  const scores = (s.scores as Record<string, number>) || {};
  return {
    id: s.id as string,
    resumeId: (s.resumeId as string) || "",
    resumeName: "",
    targetRole: (s.targetRole as string) || "",
    type: s.type as InterviewSession["type"],
    answers: [],
    scores: {
      communication: scores.communication || 0,
      confidence: scores.confidence || 0,
      technicalKnowledge: scores.technicalKnowledge || 0,
      relevance: scores.relevance || 0,
      fluency: scores.fluency || 0,
      overall: scores.overall || 0,
    },
    report: {
      placementReadiness:
        (report.placementReadiness as number) ||
        (reportRecord.placementReadiness as number) ||
        0,
      resumeScore: (report.resumeScore as number) || (reportRecord.resumeScore as number) || 0,
      interviewScore: (report.interviewScore as number) || (reportRecord.interviewScore as number) || 0,
      combinedScore: (report.combinedScore as number) || (reportRecord.combinedScore as number) || 0,
      strengths: (report.strengths as string[]) || (reportRecord.strengths as string[]) || [],
      improvements: (report.improvements as string[]) || (reportRecord.improvements as string[]) || [],
      roleFit: (report.roleFit as string) || (reportRecord.roleFit as string) || "",
      recommendation: (report.recommendation as string) || (reportRecord.recommendation as string) || "",
      hiringProbability:
        (report.hiringProbability as string) || (reportRecord.hiringProbability as string) || "",
    },
    transcript: [],
    completedAt:
      (s.completedAt as string) ||
      (s.startedAt as string) ||
      new Date().toISOString(),
    status: (s.status as string) || "completed",
  };
}
