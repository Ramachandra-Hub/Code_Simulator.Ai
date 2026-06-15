import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin } from "../memory/digital-twin";
import { getCompanyPack, COMPANY_INTERVIEW_PACKS } from "@/lib/company-interview-packs";
import { computeAtsScore } from "../evaluators/ats-scoring-engine";

export interface PlacementDriveStep {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  score?: number | null;
}

export async function getPlacementDriveStatus(userId: string, companyId?: string) {
  const company = companyId ? getCompanyPack(companyId) : null;
  const [resume, mcqCount, interviews, panelDone, twin, accepted] = await Promise.all([
    prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { atsScores: { take: 1, orderBy: { createdAt: "desc" } } },
    }),
    prisma.mcqAttempt.count({ where: { userId } }),
    prisma.interviewSession.findMany({
      where: { userId, status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    prisma.panelInterviewSession.findFirst({ where: { userId, status: "completed" } }),
    ensureDigitalTwin(userId),
    prisma.codeProblemSubmission.count({ where: { userId, verdict: "accepted" } }),
  ]);

  const resumeData = (resume?.data as Record<string, unknown>) || {};
  const ats = resume
    ? resume.atsScores[0]?.score ?? computeAtsScore(resumeData, resume.targetRole).score
    : 0;

  const hasHr = interviews.some((i) => i.type === "hr");
  const hasTechnical = interviews.some((i) => i.type === "technical" || i.type === "voice");
  const hasCoding = interviews.some((i) => i.type === "coding") || accepted >= 3;

  const steps: PlacementDriveStep[] = [
    {
      id: "resume",
      title: "Resume & ATS",
      description: company ? `${company.name} recruiters scan for ${company.focusAreas.slice(0, 3).join(", ")}` : "Resume screening",
      href: "/career-os?tab=ats",
      completed: ats >= 55,
      score: ats,
    },
    {
      id: "aptitude",
      title: "Aptitude / MCQ",
      description: "Logical and verbal readiness",
      href: "/coding-os?tab=mcq",
      completed: mcqCount >= 5,
      score: mcqCount >= 5 ? 100 : Math.min(100, mcqCount * 20),
    },
    {
      id: "technical",
      title: "Technical Round",
      description: company?.interviewStyle || "Technical depth from resume",
      href: `/interview?tab=mock&company=${companyId || "tcs"}`,
      completed: hasTechnical,
    },
    {
      id: "coding",
      title: "Coding Round",
      description: "Problem solving under time pressure",
      href: "/coding-os?tab=practice",
      completed: hasCoding,
      score: Math.min(100, accepted * 10),
    },
    {
      id: "hr",
      title: "HR Round",
      description: "Motivation, communication, fit",
      href: "/interview?tab=voice",
      completed: hasHr,
    },
    {
      id: "panel",
      title: "Panel / Final",
      description: "Multi-stakeholder evaluation",
      href: "/interview?tab=panel",
      completed: !!panelDone,
      score: twin.panelReadiness || null,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const driveReadiness = Math.round((completedCount / steps.length) * 100);

  let companyFit: number | null = null;
  if (company && resume) {
    const text = JSON.stringify(resumeData).toLowerCase();
    const hits = company.focusAreas.filter((f) => text.includes(f.toLowerCase().split(" ")[0])).length;
    companyFit = Math.round((hits / company.focusAreas.length) * 60 + ats * 0.4);
  }

  return {
    company: company || null,
    companies: COMPANY_INTERVIEW_PACKS,
    steps,
    driveReadiness,
    companyFit,
    placementReadiness: Math.round(twin.placementScore),
    completedCount,
    totalSteps: steps.length,
  };
}
