import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin } from "../../career-intelligence/memory/digital-twin";
import { computeGrowthPotential } from "../engines/growth-potential-engine";
import { computeCareerVelocity } from "../engines/career-velocity-engine";
import { computeJobFit } from "../engines/job-fit-engine";
import { computeHiringRecommendation } from "../engines/hiring-recommendation-engine";

export interface CandidateIntelligence {
  userId: string;
  name: string;
  email: string;
  college: string | null;
  targetRole: string | null;
  resumeScore: number;
  atsScore: number;
  technicalScore: number;
  codingScore: number;
  communicationScore: number;
  confidenceScore: number;
  panelReadiness: number;
  placementReadiness: number;
  githubScore: number;
  linkedinScore: number;
  leetcodeScore: number;
  hackerrankScore: number;
  professionalReadiness: number;
  growthPotentialScore: number;
  growthTier: string;
  careerVelocityScore: number;
  careerVelocityTrend: string;
  learningVelocity: number;
  digitalTwinSummary: {
    strengths: string[];
    weaknesses: string[];
    placementScore: number;
    executiveCommunication: number;
    stakeholderManagement: number;
    pressureHandling: number;
  };
  hiringRecommendation?: string;
}

function trendDelta(series: number[]): number {
  if (series.length < 2) return series[0] || 0;
  return series[series.length - 1] - series[0];
}

export async function gatherCandidateIntelligence(userId: string): Promise<CandidateIntelligence | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      college: true,
      profile: true,
      intelligence: true,
      resumes: { include: { atsScores: { take: 1, orderBy: { createdAt: "desc" } } }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  if (!user || user.role !== "student") return null;

  const profile = user.intelligence || (await ensureDigitalTwin(userId));
  const resume = user.resumes[0];
  const atsScore = resume?.atsScores[0]?.score ?? 0;

  const [placementHistory, snapshots, roadmapItems, coachRecs, usageEvents, voiceMetrics] = await Promise.all([
    prisma.placementReadiness.findMany({ where: { userId }, orderBy: { computedAt: "asc" }, take: 12 }),
    prisma.digitalTwinSnapshot.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "asc" },
      take: 24,
    }),
    prisma.roadmapItem.findMany({
      where: { roadmap: { userId } },
    }),
    prisma.recommendation.count({ where: { userId, type: "career_coach" } }),
    prisma.usageEvent.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
    prisma.voiceMetrics.findMany({
      where: { voiceSession: { userId } },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
  ]);

  const interviewTrend = Math.max(0, trendDelta(placementHistory.map((p) => p.interviewReadiness || 0)) * 5 + 50);
  const codingTrend = Math.max(0, trendDelta(placementHistory.map((p) => p.codingReadiness || 0)) * 5 + 50);
  const completedRoadmap = roadmapItems.filter((i) => i.status === "completed").length;
  const roadmapCompletion = roadmapItems.length ? (completedRoadmap / roadmapItems.length) * 100 : 30;
  const githubSnaps = snapshots.map((s) => ((s.data as Record<string, unknown>)?.githubScore as number) || 0).filter(Boolean);
  const githubGrowth = githubSnaps.length >= 2 ? Math.min(100, (githubSnaps[githubSnaps.length - 1] - githubSnaps[0]) * 3 + 50) : profile.githubScore * 0.5;

  const growth = computeGrowthPotential({
    interviewTrend,
    codingTrend,
    roadmapCompletion,
    githubGrowth,
    coachEngagement: Math.min(100, coachRecs * 15 + 20),
    learningConsistency: Math.min(100, usageEvents * 5 + 15),
  });

  const velocitySnaps = [
    ...placementHistory.map((p) => ({
      date: p.computedAt,
      placement: p.overallScore,
      coding: p.codingReadiness || 0,
      interview: p.interviewReadiness || 0,
      professional: profile.professionalReadiness,
      technical: profile.technicalScore,
    })),
    ...snapshots.map((s) => {
      const d = (s.data as Record<string, unknown>) || {};
      const derived = (d.derivedUpdates as Record<string, number>) || {};
      return {
        date: s.createdAt,
        placement: derived.placementScore,
        coding: derived.codingReadiness,
        interview: derived.interviewReadiness,
        professional: derived.professionalReadiness,
        technical: derived.technicalScore,
      };
    }),
  ].filter((s) => s.date);

  const velocity = computeCareerVelocity({ snapshots: velocitySnaps });
  const voiceAvg =
    voiceMetrics.length > 0
      ? voiceMetrics.reduce((s, m) => s + (m.communicationScore || 0), 0) / voiceMetrics.length
      : profile.communicationScore;

  await prisma.growthPotentialSnapshot.create({
    data: { userId, score: growth.score, tier: growth.tier, factors: growth.factors as object },
  });

  const latestPlacement = placementHistory[placementHistory.length - 1];

  return {
    userId,
    name: user.name,
    email: user.email,
    college: user.college?.name || user.profile?.institution || null,
    targetRole: resume?.targetRole || user.profile?.careerGoal || null,
    resumeScore: atsScore,
    atsScore,
    technicalScore: profile.technicalScore,
    codingScore: profile.codingReadiness,
    communicationScore: Math.round((profile.communicationScore + voiceAvg) / 2),
    confidenceScore: profile.confidenceScore || Math.round((profile.communicationScore + profile.interviewReadiness) / 2),
    panelReadiness: profile.panelReadiness,
    placementReadiness: latestPlacement?.overallScore ?? profile.placementScore,
    githubScore: profile.githubScore,
    linkedinScore: profile.linkedinScore,
    leetcodeScore: profile.leetcodeScore,
    hackerrankScore: profile.hackerrankScore,
    professionalReadiness: profile.professionalReadiness,
    growthPotentialScore: growth.score,
    growthTier: growth.tier,
    careerVelocityScore: velocity.careerVelocityScore,
    careerVelocityTrend: velocity.trend,
    learningVelocity: Math.round(roadmapCompletion * 0.6 + usageEvents * 4),
    digitalTwinSummary: {
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      placementScore: profile.placementScore,
      executiveCommunication: profile.executiveCommunication,
      stakeholderManagement: profile.stakeholderManagement,
      pressureHandling: profile.pressureHandling,
    },
  };
}

export async function listTalentCandidates(limit = 50): Promise<CandidateIntelligence[]> {
  const students = await prisma.user.findMany({
    where: { role: "student", intelligence: { isNot: null } },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  const results: CandidateIntelligence[] = [];
  for (const s of students) {
    const intel = await gatherCandidateIntelligence(s.id);
    if (intel) results.push(intel);
  }
  return results.sort((a, b) => b.placementReadiness - a.placementReadiness);
}

export async function matchJobToCandidates(jobId: string) {
  const job = await prisma.jobDescription.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");

  const candidates = await listTalentCandidates(100);
  const skills = job.skills.length ? job.skills : extractSkillsFromText(job.description);

  const matches = candidates.map((c) => {
    const user = { userId: c.userId };
    void user;
    const fit = computeJobFit({
      jobSkills: skills,
      jobTitle: job.title,
      jobDescription: job.description,
      candidate: {
        technicalScore: c.technicalScore,
        codingReadiness: c.codingScore,
        communicationScore: c.communicationScore,
        confidenceScore: c.confidenceScore,
        panelReadiness: c.panelReadiness,
        professionalReadiness: c.professionalReadiness,
        githubScore: c.githubScore,
        linkedinScore: c.linkedinScore,
        leetcodeScore: c.leetcodeScore,
        skills: skills.length ? skills : ["JavaScript", "Python", "DSA"],
        strengths: c.digitalTwinSummary.strengths,
      },
    });

    const hiring = computeHiringRecommendation({
      overallMatch: fit.overallMatch,
      placementReadiness: c.placementReadiness,
      growthPotentialScore: c.growthPotentialScore,
      careerVelocityScore: c.careerVelocityScore,
      panelReadiness: c.panelReadiness,
      professionalReadiness: c.professionalReadiness,
      twinStrengths: c.digitalTwinSummary.strengths,
      twinWeaknesses: c.digitalTwinSummary.weaknesses,
    });

    return { candidate: c, fit, hiring };
  });

  matches.sort((a, b) => b.fit.overallMatch - a.fit.overallMatch);

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    await prisma.talentMatch.upsert({
      where: { jobId_candidateId: { jobId, candidateId: m.candidate.userId } },
      create: {
        jobId,
        candidateId: m.candidate.userId,
        technicalFit: m.fit.technicalFit,
        codingFit: m.fit.codingFit,
        communicationFit: m.fit.communicationFit,
        leadershipFit: m.fit.leadershipFit,
        professionalFit: m.fit.professionalFit,
        overallMatch: m.fit.overallMatch,
        ranking: i + 1,
        factors: { matchedSkills: m.fit.matchedSkills, missingSkills: m.fit.missingSkills } as object,
      },
      update: {
        technicalFit: m.fit.technicalFit,
        codingFit: m.fit.codingFit,
        communicationFit: m.fit.communicationFit,
        leadershipFit: m.fit.leadershipFit,
        professionalFit: m.fit.professionalFit,
        overallMatch: m.fit.overallMatch,
        ranking: i + 1,
        factors: { matchedSkills: m.fit.matchedSkills, missingSkills: m.fit.missingSkills } as object,
      },
    });

    await prisma.hiringDecision.create({
      data: {
        jobId,
        candidateId: m.candidate.userId,
        decision: m.hiring.decision,
        confidence: m.hiring.confidence,
        reasoning: m.hiring.reasoning,
        data: { highlights: m.hiring.highlights, risks: m.hiring.risks } as object,
      },
    });
  }

  return matches.slice(0, 30);
}

export async function buildTalentRadar() {
  const candidates = await listTalentCandidates(100);

  const categories: Array<{ category: string; title: string; sort: (c: CandidateIntelligence) => number }> = [
    { category: "backend", title: "Top Backend Talent", sort: (c) => c.technicalScore * 0.6 + c.codingScore * 0.4 },
    { category: "frontend", title: "Top Frontend Talent", sort: (c) => c.communicationScore * 0.4 + c.technicalScore * 0.6 },
    { category: "ai", title: "Top AI Talent", sort: (c) => c.growthPotentialScore * 0.5 + c.technicalScore * 0.5 },
    { category: "fullstack", title: "Top Full Stack Talent", sort: (c) => (c.technicalScore + c.codingScore + c.professionalReadiness) / 3 },
    { category: "improving", title: "Fastest Improving Students", sort: (c) => c.careerVelocityScore },
    { category: "growth", title: "Highest Growth Potential", sort: (c) => c.growthPotentialScore },
    { category: "interview_ready", title: "Most Interview Ready", sort: (c) => c.placementReadiness * 0.5 + c.panelReadiness * 0.5 },
    { category: "placement_ready", title: "Most Placement Ready", sort: (c) => c.placementReadiness },
  ];

  const radar = [];
  for (const cat of categories) {
    const ranked = [...candidates].sort((a, b) => cat.sort(b) - cat.sort(a)).slice(0, 8);
    const snap = await prisma.talentRadarSnapshot.create({
      data: {
        category: cat.category,
        title: cat.title,
        candidateIds: ranked.map((r) => r.userId),
        scores: ranked.map((r) => ({ userId: r.userId, name: r.name, score: cat.sort(r) })) as object,
      },
    });
    radar.push({ ...snap, candidates: ranked });
  }
  return radar;
}

export async function runCopilotQuery(query: string, recruiterUserId: string) {
  const q = query.toLowerCase();
  let candidates = await listTalentCandidates(100);
  let answer = "";
  let results = candidates;

  if (process.env.QDRANT_URL) {
    try {
      const { semanticTalentSearch } = await import("../../core/memory/semantic-search-service");
      const semantic = await semanticTalentSearch(query, 10);
      if (semantic.length) {
        const idSet = new Set(semantic.map((s) => s.metadata.userId as string).filter(Boolean));
        const semanticMatches = candidates.filter((c) => idSet.has(c.userId));
        if (semanticMatches.length) {
          results = semanticMatches;
          answer = `Semantic talent search (Qdrant + embeddings) matched ${semanticMatches.length} candidates.`;
        }
      }
    } catch {
      /* fall through to heuristics */
    }
  }

  if (!answer && /java/i.test(q)) {
    results = candidates.filter((c) => c.technicalScore >= 60).sort((a, b) => b.codingScore - a.codingScore);
    answer = `Found ${results.length} candidates with strong technical signals for Java/backend roles (Digital Twin ranked).`;
  } else if (!answer && /ai|machine learning|ml/i.test(q)) {
    results = candidates.sort((a, b) => b.growthPotentialScore - a.growthPotentialScore);
    answer = `Top AI-potential candidates ranked by growth potential and technical depth — not resume keywords alone.`;
  } else if (!answer && /improv|fastest|velocity/i.test(q)) {
    results = candidates.sort((a, b) => b.careerVelocityScore - a.careerVelocityScore);
    answer = `Candidates with highest career velocity (30-day skill acceleration from Digital Twin trends).`;
  } else if (!answer && /google|sde|fit/i.test(q)) {
    results = candidates.sort((a, b) => b.placementReadiness - a.placementReadiness);
    answer = `Candidates ranked by placement readiness for senior SDE bar — combine with a uploaded JD for precise job fit.`;
  } else if (!answer && /coach|month|needs/i.test(q)) {
    results = candidates.filter((c) => c.growthPotentialScore >= 50 && c.placementReadiness < 70);
    answer = `High-potential candidates who would benefit from ~1 month of targeted coaching before enterprise interviews.`;
  } else if (!answer && /top|best|hire/i.test(q)) {
    results = candidates.sort((a, b) => b.placementReadiness + b.growthPotentialScore - (a.placementReadiness + a.growthPotentialScore));
    answer = `Top talent by combined placement readiness and growth potential.`;
  } else if (!answer) {
    results = candidates.slice(0, 10);
    answer = `Showing top candidates by Digital Twin placement readiness. Try: "Find top Java developers", "Who is improving fastest?"`;
  }

  const recruiter = await prisma.recruiterUser.findUnique({ where: { userId: recruiterUserId } });
  if (recruiter) {
    await prisma.recruiterSearch.create({
      data: {
        recruiterId: recruiter.id,
        query,
        results: results.slice(0, 15).map((r) => ({ userId: r.userId, name: r.name, placementReadiness: r.placementReadiness })) as object,
      },
    });
  }

  return { answer, candidates: results.slice(0, 15), query };
}

function extractSkillsFromText(text: string): string[] {
  const known = ["Java", "Python", "JavaScript", "TypeScript", "React", "Node", "AWS", "SQL", "DSA", "Spring", "Go", "Kubernetes", "ML", "AI"];
  return known.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
}

export async function getRecruiterOverview(recruiterUserId: string) {
  const candidates = await listTalentCandidates(20);
  const jobs = await prisma.jobDescription.findMany({
    where: { recruiter: { userId: recruiterUserId } },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  const shortlists = await prisma.candidateShortlist.count({
    where: { recruiter: { userId: recruiterUserId }, status: "shortlisted" },
  });

  return {
    totalCandidates: candidates.length,
    avgPlacementReadiness: candidates.length
      ? Math.round(candidates.reduce((s, c) => s + c.placementReadiness, 0) / candidates.length)
      : 0,
    highGrowthCount: candidates.filter((c) => c.growthTier === "high" || c.growthTier === "exceptional").length,
    openJobs: jobs.filter((j) => j.status === "open").length,
    shortlistCount: shortlists,
    topCandidates: candidates.slice(0, 5),
    recentJobs: jobs,
  };
}

export async function ensureRecruiterProfile(userId: string) {
  let profile = await prisma.recruiterUser.findUnique({ where: { userId } });
  if (!profile) {
    let company = await prisma.recruiterCompany.findFirst({ where: { name: "NexusEdge Partner" } });
    if (!company) {
      company = await prisma.recruiterCompany.create({ data: { name: "NexusEdge Partner", industry: "Technology" } });
    }
    profile = await prisma.recruiterUser.create({
      data: { userId, companyId: company.id, title: "Talent Partner" },
    });
  }
  return profile;
}

export async function getRecruiterAnalytics() {
  const candidates = await listTalentCandidates(100);
  const collegeMap = new Map<string, number>();
  const skillMap = new Map<string, number>();

  for (const c of candidates) {
    const college = c.college || "Unknown";
    collegeMap.set(college, (collegeMap.get(college) || 0) + 1);
    for (const s of c.digitalTwinSummary.strengths) {
      skillMap.set(s, (skillMap.get(s) || 0) + 1);
    }
  }

  const topColleges = [...collegeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const topSkills = [...skillMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([skill, count]) => ({ skill, count }));

  const placementTrend = candidates.map((c) => ({
    name: c.name,
    placementReadiness: c.placementReadiness,
    growthTier: c.growthTier,
  }));

  return {
    totalTalent: candidates.length,
    avgPlacement: candidates.length
      ? Math.round(candidates.reduce((s, c) => s + c.placementReadiness, 0) / candidates.length)
      : 0,
    highGrowth: candidates.filter((c) => c.growthTier === "high" || c.growthTier === "exceptional").length,
    interviewReady: candidates.filter((c) => c.placementReadiness >= 70).length,
    topColleges,
    topSkills,
    placementTrend,
    talentAvailability: {
      backend: candidates.filter((c) => c.technicalScore >= 65).length,
      frontend: candidates.filter((c) => c.communicationScore >= 60 && c.technicalScore >= 55).length,
      ai: candidates.filter((c) => c.growthPotentialScore >= 65).length,
      placementReady: candidates.filter((c) => c.placementReadiness >= 75).length,
    },
  };
}

export function generateInterviewPlan(intel: CandidateIntelligence) {
  const focus = intel.digitalTwinSummary.weaknesses.slice(0, 3);
  return {
    candidateId: intel.userId,
    candidateName: intel.name,
    duration: "45 minutes",
    rounds: [
      { round: 1, type: "Technical", focus: focus[0] || "DSA fundamentals", duration: "20 min" },
      { round: 2, type: "System Design", focus: "Architecture depth", duration: "15 min" },
      { round: 3, type: "Behavioral", focus: intel.digitalTwinSummary.strengths[0] || "Leadership", duration: "10 min" },
    ],
    twinSignals: {
      placementReadiness: intel.placementReadiness,
      panelReadiness: intel.panelReadiness,
      growthTier: intel.growthTier,
    },
    coachingNotes: focus.length ? `Address gaps: ${focus.join(", ")}` : "Standard enterprise bar interview",
  };
}

export async function listShortlists(recruiterUserId: string) {
  const recruiter = await ensureRecruiterProfile(recruiterUserId);
  return prisma.candidateShortlist.findMany({
    where: { recruiterId: recruiter.id },
    include: { candidate: { select: { id: true, name: true, email: true } }, job: { select: { id: true, title: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertShortlist(
  recruiterUserId: string,
  data: { candidateId: string; jobId?: string; status?: string; notes?: string; generatePlan?: boolean }
) {
  const recruiter = await ensureRecruiterProfile(recruiterUserId);
  const intel = data.generatePlan ? await gatherCandidateIntelligence(data.candidateId) : null;
  const interviewPlan = intel ? generateInterviewPlan(intel) : undefined;

  const existing = await prisma.candidateShortlist.findFirst({
    where: {
      recruiterId: recruiter.id,
      candidateId: data.candidateId,
      jobId: data.jobId ?? null,
    },
  });

  if (existing) {
    return prisma.candidateShortlist.update({
      where: { id: existing.id },
      data: {
        status: data.status ?? existing.status,
        notes: data.notes ?? existing.notes,
        ...(interviewPlan ? { interviewPlan: interviewPlan as object } : {}),
      },
      include: { candidate: { select: { id: true, name: true, email: true } } },
    });
  }

  return prisma.candidateShortlist.create({
    data: {
      recruiterId: recruiter.id,
      candidateId: data.candidateId,
      jobId: data.jobId,
      status: data.status || "shortlisted",
      notes: data.notes,
      interviewPlan: interviewPlan as object | undefined,
    },
    include: { candidate: { select: { id: true, name: true, email: true } } },
  });
}
