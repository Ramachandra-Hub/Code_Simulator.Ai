import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin, updateDigitalTwin } from "../../career-intelligence/memory/digital-twin";
import { gatherCareerOSContext } from "../../career-os/services/career-os-service";
import { generateTasksForRole } from "../engines/task-engine";
import { evaluateStandup } from "../engines/standup-evaluator";
import { runCodeReview } from "../engines/code-review-engine";
import { defaultMeetingsForSession, generateMeeting, scoreMeetingParticipation } from "../engines/meeting-engine";
import {
  computePerformanceReview,
  assessPromotion,
  type PerformanceDimensions,
} from "../engines/performance-review-engine";

const COMPANY_SEEDS = [
  {
    name: "NexusEdge Labs",
    culture: "startup",
    description: "Fast-moving AI product company — ship weekly, own outcomes.",
    departments: ["Engineering", "Product", "QA"],
  },
  {
    name: "CloudScale Systems",
    culture: "enterprise",
    description: "Enterprise SaaS at scale — reliability, process, stakeholder alignment.",
    departments: ["Platform", "Product", "Customer Success"],
  },
  {
    name: "Velocity AI",
    culture: "bigtech",
    description: "Big-tech simulation — design docs, code reviews, cross-functional rituals.",
    departments: ["Core ML", "Infrastructure", "Applied Research"],
  },
];

export async function seedVirtualCompanies(): Promise<void> {
  const count = await prisma.virtualCompany.count();
  if (count > 0) return;

  for (const c of COMPANY_SEEDS) {
    await prisma.virtualCompany.create({
      data: {
        name: c.name,
        culture: c.culture,
        description: c.description,
        departments: {
          create: c.departments.map((name) => ({ name, focus: name.toLowerCase() })),
        },
      },
    });
  }
}

export async function getOrCreateOfficeSession(userId: string) {
  await seedVirtualCompanies();

  let session = await prisma.officeSession.findFirst({
    where: { userId, status: "active" },
    include: {
      company: true,
      department: true,
      tasks: { orderBy: { priority: "desc" } },
      meetings: { orderBy: { scheduledAt: "asc" } },
      standups: { orderBy: { createdAt: "desc" }, take: 7 },
      codeReviews: { orderBy: { createdAt: "desc" }, take: 5 },
      reviews: { orderBy: { createdAt: "desc" }, take: 4 },
      promotions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (session) return session;

  const company = await prisma.virtualCompany.findFirst({ include: { departments: true } });
  if (!company) throw new Error("No virtual companies seeded");

  const dept = company.departments.find((d) => d.name === "Engineering") || company.departments[0];
  const careerCtx = await gatherCareerOSContext(userId);

  session = await prisma.officeSession.create({
    data: {
      userId,
      companyId: company.id,
      departmentId: dept?.id,
      role: "software_engineer",
      level: careerCtx.twin.codingReadiness >= 70 ? "mid" : "junior",
      status: "active",
    },
    include: {
      company: true,
      department: true,
      tasks: true,
      meetings: true,
      standups: true,
      codeReviews: true,
      reviews: true,
      promotions: true,
    },
  });

  const tasks = generateTasksForRole(session.role, 5);
  await prisma.workTask.createMany({
    data: tasks.map((t) => ({
      sessionId: session!.id,
      title: t.title,
      type: t.type,
      description: t.description,
      priority: t.priority,
      twinContext: { weaknesses: careerCtx.weaknesses.slice(0, 3) },
    })),
  });

  const meetings = defaultMeetingsForSession();
  const base = Date.now();
  await prisma.meeting.createMany({
    data: meetings.map((m, i) => ({
      sessionId: session!.id,
      type: m.type,
      title: m.title,
      agenda: { topics: m.topics, facilitator: m.facilitator },
      voiceEnabled: m.voiceEnabled,
      scheduledAt: new Date(base + i * 86400000),
    })),
  });

  return prisma.officeSession.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      company: true,
      department: true,
      tasks: { orderBy: { priority: "desc" } },
      meetings: { orderBy: { scheduledAt: "asc" } },
      standups: { orderBy: { createdAt: "desc" }, take: 7 },
      codeReviews: { orderBy: { createdAt: "desc" }, take: 5 },
      reviews: { orderBy: { createdAt: "desc" }, take: 4 },
      promotions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

async function emitOfficeTwinSignal(userId: string, data: Record<string, unknown>) {
  await updateDigitalTwin(userId, { type: "office", source: "virtual-office", data });
}

function standupAverages(standups: Array<{ communicationScore: number; ownershipScore: number; professionalismScore: number }>) {
  if (!standups.length) return { communication: 50, ownership: 50, professionalism: 50 };
  const n = standups.length;
  return {
    communication: standups.reduce((s, x) => s + x.communicationScore, 0) / n,
    ownership: standups.reduce((s, x) => s + x.ownershipScore, 0) / n,
    professionalism: standups.reduce((s, x) => s + x.professionalismScore, 0) / n,
  };
}

export async function getOfficeOverview(userId: string) {
  const [session, twin, achievements, careerCtx] = await Promise.all([
    getOrCreateOfficeSession(userId),
    ensureDigitalTwin(userId),
    prisma.officeAchievement.findMany({ where: { userId }, orderBy: { achievedAt: "desc" }, take: 5 }),
    gatherCareerOSContext(userId),
  ]);

  const completedTasks = session.tasks.filter((t) => t.status === "completed").length;
  const taskRate = session.tasks.length ? Math.round((completedTasks / session.tasks.length) * 100) : 0;
  const analytics = await getOfficeAnalytics(userId);

  return {
    session: {
      id: session.id,
      role: session.role,
      level: session.level,
      company: session.company,
      department: session.department,
    },
    todayWork: session.tasks.filter((t) => t.status !== "completed").slice(0, 3),
    upcomingMeetings: session.meetings.filter((m) => m.status !== "completed").slice(0, 3),
    latestStandup: session.standups[0] || null,
    taskCompletionRate: taskRate,
    twinOffice: {
      leadership: twin.leadershipScore,
      ownership: twin.ownershipScore,
      collaboration: twin.collaborationScore,
      stakeholderManagement: twin.stakeholderManagement,
      promotionReadiness: twin.promotionReadiness,
    },
    careerPlacement: careerCtx.placementReadiness,
    achievements,
    analytics,
  };
}

export async function getTodaysWork(userId: string) {
  const session = await getOrCreateOfficeSession(userId);
  const pending = session.tasks.filter((t) => t.status !== "completed");
  const completed = session.tasks.filter((t) => t.status === "completed");
  return { pending, completed, sessionId: session.id };
}

export async function submitStandup(
  userId: string,
  input: { yesterday: string; today: string; blockers?: string }
) {
  const session = await getOrCreateOfficeSession(userId);
  const evalResult = evaluateStandup(input);

  const report = await prisma.standupReport.create({
    data: {
      sessionId: session.id,
      yesterday: input.yesterday,
      today: input.today,
      blockers: input.blockers,
      communicationScore: evalResult.communicationScore,
      ownershipScore: evalResult.ownershipScore,
      professionalismScore: evalResult.professionalismScore,
      feedback: evalResult.feedback,
    },
  });

  await emitOfficeTwinSignal(userId, {
    communicationScore: evalResult.communicationScore,
    ownershipScore: evalResult.ownershipScore,
    collaborationScore: Math.round((evalResult.communicationScore + evalResult.professionalismScore) / 2),
    leadershipScore: evalResult.ownershipScore,
    stakeholderManagement: evalResult.professionalismScore,
    promotionReadiness: Math.round(
      (evalResult.communicationScore + evalResult.ownershipScore + evalResult.professionalismScore) / 3
    ),
  });

  return report;
}

export async function generateOfficeTasks(userId: string) {
  const session = await getOrCreateOfficeSession(userId);
  const careerCtx = await gatherCareerOSContext(userId);
  const tasks = generateTasksForRole(session.role, 3);

  const created = await Promise.all(
    tasks.map((t) =>
      prisma.workTask.create({
        data: {
          sessionId: session.id,
          title: t.title,
          type: t.type,
          description: t.description,
          priority: t.priority,
          twinContext: { weaknesses: careerCtx.weaknesses.slice(0, 3) },
        },
      })
    )
  );
  return created;
}

export async function completeTask(userId: string, taskId: string) {
  const session = await getOrCreateOfficeSession(userId);
  const task = await prisma.workTask.findFirst({ where: { id: taskId, sessionId: session.id } });
  if (!task) throw new Error("Task not found");

  const updated = await prisma.workTask.update({
    where: { id: taskId },
    data: { status: "completed", completedAt: new Date() },
  });

  const completed = session.tasks.filter((t) => t.status === "completed").length + 1;
  const rate = Math.round((completed / Math.max(session.tasks.length, 1)) * 100);

  await emitOfficeTwinSignal(userId, {
    ownershipScore: Math.min(100, 50 + rate * 0.4),
    collaborationScore: Math.min(100, 45 + completed * 3),
  });

  if (completed >= 3) {
    const existing = await prisma.officeAchievement.findFirst({
      where: { userId, category: "tasks", title: "Task Finisher" },
    });
    if (!existing) {
      await prisma.officeAchievement.create({
        data: { userId, title: "Task Finisher", category: "tasks", badge: "✓", metadata: { completed } },
      });
    }
  }

  return updated;
}

export async function submitCodeReview(userId: string, input: { code: string; language?: string }) {
  const session = await getOrCreateOfficeSession(userId);
  const result = runCodeReview(input);

  const review = await prisma.codeReview.create({
    data: {
      sessionId: session.id,
      code: input.code,
      language: input.language || "typescript",
      questions: result.questions,
      feedback: result.feedback,
      score: result.score,
      status: "reviewed",
      reviewerAgent: "senior-engineer",
    },
  });

  await emitOfficeTwinSignal(userId, {
    technicalScore: result.score,
    ownershipScore: Math.min(100, result.score * 0.7 + 20),
    leadershipScore: Math.min(100, result.score * 0.5 + 25),
  });

  return review;
}

export async function completeMeeting(
  userId: string,
  meetingId: string,
  input?: { transcript?: string; notes?: string }
) {
  const session = await getOrCreateOfficeSession(userId);
  const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, sessionId: session.id } });
  if (!meeting) throw new Error("Meeting not found");

  const scores = scoreMeetingParticipation(input?.transcript || input?.notes);
  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: "completed",
      completedAt: new Date(),
      transcript: input ? { transcript: input.transcript, notes: input.notes } : undefined,
      scores,
    },
  });

  await emitOfficeTwinSignal(userId, {
    stakeholderManagement: scores.engagement,
    collaborationScore: scores.participation,
    leadershipScore: scores.clarity,
    communicationScore: scores.clarity,
  });

  return updated;
}

export async function scheduleMeeting(userId: string, type: "sprint_planning" | "retrospective" | "client" | "design_review") {
  const session = await getOrCreateOfficeSession(userId);
  const agenda = generateMeeting(type);
  return prisma.meeting.create({
    data: {
      sessionId: session.id,
      type: agenda.type,
      title: agenda.title,
      agenda: { topics: agenda.topics, facilitator: agenda.facilitator },
      voiceEnabled: agenda.voiceEnabled,
    },
  });
}

async function buildPerformanceInputs(userId: string, sessionId: string) {
  const [twin, standups, tasks, reviews, meetings] = await Promise.all([
    ensureDigitalTwin(userId),
    prisma.standupReport.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" }, take: 7 }),
    prisma.workTask.findMany({ where: { sessionId } }),
    prisma.codeReview.findMany({ where: { sessionId } }),
    prisma.meeting.findMany({ where: { sessionId, status: "completed" } }),
  ]);

  const completed = tasks.filter((t) => t.status === "completed").length;
  const taskCompletionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const codeReviewAvg = reviews.length ? reviews.reduce((s, r) => s + r.score, 0) / reviews.length : twin.codingReadiness;
  const meetingParticipation =
    meetings.length && meetings[0].scores
      ? ((meetings[0].scores as { engagement?: number }).engagement ?? 60)
      : 55;

  return {
    standupAvg: standupAverages(standups),
    taskCompletionRate,
    codeReviewAvg,
    meetingParticipation,
    twin: {
      technicalScore: twin.technicalScore,
      communicationScore: twin.communicationScore,
      leadershipScore: twin.leadershipScore,
      ownershipScore: twin.ownershipScore,
      collaborationScore: twin.collaborationScore,
      stakeholderManagement: twin.stakeholderManagement,
    },
  };
}

export async function runPerformanceReview(userId: string, period: "weekly" | "monthly") {
  const session = await getOrCreateOfficeSession(userId);
  const inputs = await buildPerformanceInputs(userId, session.id);
  const dims = computePerformanceReview(period, inputs);

  const review = await prisma.performanceReview.create({
    data: {
      sessionId: session.id,
      period,
      technical: dims.technical,
      communication: dims.communication,
      ownership: dims.ownership,
      leadership: dims.leadership,
      collaboration: dims.collaboration,
      promotionReady: dims.promotionReady,
      summary: dims.summary,
    },
  });

  await emitOfficeTwinSignal(userId, {
    leadershipScore: dims.leadership,
    ownershipScore: dims.ownership,
    collaborationScore: dims.collaboration,
    stakeholderManagement: inputs.twin.stakeholderManagement,
    promotionReadiness: dims.promotionReady,
    communicationScore: dims.communication,
  });

  return review;
}

export async function runPromotionAssessment(userId: string) {
  const session = await getOrCreateOfficeSession(userId);
  const inputs = await buildPerformanceInputs(userId, session.id);
  const dims = computePerformanceReview("monthly", inputs);
  const assessment = assessPromotion(dims);

  const record = await prisma.promotionAssessment.create({
    data: {
      sessionId: session.id,
      ready: assessment.ready,
      score: assessment.score,
      gaps: assessment.gaps,
      recommendation: assessment.recommendation,
    },
  });

  await emitOfficeTwinSignal(userId, { promotionReadiness: assessment.score, leadershipScore: dims.leadership });

  return { assessment: record, dimensions: dims };
}

export async function getOfficeAnalytics(userId: string) {
  const session = await getOrCreateOfficeSession(userId);
  const [tasks, meetings, reviews, perfReviews] = await Promise.all([
    prisma.workTask.findMany({ where: { sessionId: session.id } }),
    prisma.meeting.findMany({ where: { sessionId: session.id } }),
    prisma.codeReview.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "asc" } }),
    prisma.performanceReview.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "asc" } }),
  ]);

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completedMeetings = meetings.filter((m) => m.status === "completed").length;
  const avgReviewScore = reviews.length ? reviews.reduce((s, r) => s + r.score, 0) / reviews.length : 0;

  return {
    taskCompletion: {
      total: tasks.length,
      completed: completedTasks,
      rate: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
    },
    meetingParticipation: {
      total: meetings.length,
      attended: completedMeetings,
      rate: meetings.length ? Math.round((completedMeetings / meetings.length) * 100) : 0,
    },
    codeReviewQuality: {
      count: reviews.length,
      averageScore: Math.round(avgReviewScore),
      trend: reviews.slice(-3).map((r) => ({ date: r.createdAt, score: r.score })),
    },
    performanceTrends: perfReviews.map((p) => ({
      period: p.period,
      date: p.createdAt,
      technical: p.technical,
      communication: p.communication,
      ownership: p.ownership,
      leadership: p.leadership,
      collaboration: p.collaboration,
      promotionReady: p.promotionReady,
    })),
  };
}
