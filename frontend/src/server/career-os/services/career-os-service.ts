import { prisma } from "../../core/db/prisma";
import { ensureDigitalTwin } from "../../career-intelligence/memory/digital-twin";
import { gatherStudentCoachContext } from "../../career-intelligence/services/career-coach-service";
import { getLatestPlacementReadiness } from "../../career-intelligence/services/placement-readiness-service";
import { computeGrowthPotential } from "../../talent/engines/growth-potential-engine";
import { computeCareerVelocity } from "../../talent/engines/career-velocity-engine";
import {
  generateDailyMission,
  generateWeeklyMission,
  generateMonthlyMission,
  GOAL_TEMPLATES,
} from "../engines/mission-engine";
import { computePlacementPrediction } from "../engines/placement-prediction-engine";
import { computeLearningVelocity } from "../engines/learning-velocity-engine";
import { computeFuturePotential } from "../engines/future-potential-engine";
import {
  buildPersonalizedCoachMessage,
  getNextBestActions,
  getReadinessDelta,
  getTwinActivityFeed,
} from "../../career-intelligence/services/twin-activity-service";
import { getDsaRoadmap } from "../../coding-os/dsa-progress-service";

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function trendDelta(series: number[]): number {
  if (series.length < 2) return series[0] || 0;
  return series[series.length - 1] - series[0];
}

export async function gatherCareerOSContext(userId: string) {
  const [coach, twin, placement, roadmapItems, habits, coachRecs, usageEvents, placementHistory] =
    await Promise.all([
      gatherStudentCoachContext(userId),
      ensureDigitalTwin(userId),
      getLatestPlacementReadiness(userId),
      prisma.roadmapItem.findMany({ where: { roadmap: { userId }, status: "pending" }, take: 5 }),
      prisma.habitTracker.findMany({ where: { userId } }),
      prisma.recommendation.count({ where: { userId, type: "career_coach" } }),
      prisma.usageEvent.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      prisma.placementReadiness.findMany({ where: { userId }, orderBy: { computedAt: "asc" }, take: 12 }),
    ]);

  const interviewImprovements =
    coach.interviewReports.flatMap((r) => r.improvements).slice(0, 5);

  return {
    userId,
    twin,
    coach,
    placementReadiness: placement?.overallScore ?? twin.placementScore,
    targetRole: coach.targetRole,
    weaknesses: twin.weaknesses,
    strengths: twin.strengths,
    roadmapPending: roadmapItems.map((i) => i.title),
    interviewImprovements,
    habits,
    coachEngagement: coachRecs,
    usageEvents,
    placementHistory,
  };
}

export async function getCareerOSOverview(userId: string) {
  const ctx = await gatherCareerOSContext(userId);
  const velocity = await computeAndPersistLearningVelocity(userId, ctx);
  const future = await computeAndPersistFuturePotential(userId, ctx, velocity.score);
  const predictions = await computeAndPersistPredictions(userId, ctx, velocity.score);

  const [readinessDelta, twinActivity, nextActions, dsa, user, lastInterview] = await Promise.all([
    getReadinessDelta(userId),
    getTwinActivityFeed(userId, 6),
    getNextBestActions(userId),
    getDsaRoadmap(userId).catch(() => null),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.interviewSession.findFirst({
      where: { userId, status: "completed" },
      orderBy: { completedAt: "desc" },
      select: { type: true },
    }),
  ]);

  const accepted = await prisma.codeProblemSubmission.count({
    where: { userId, verdict: "accepted" },
  });

  const coachMessage = buildPersonalizedCoachMessage({
    name: user?.name,
    targetRole: ctx.targetRole,
    placementReadiness: ctx.placementReadiness,
    readinessDelta: readinessDelta.delta,
    weaknesses: ctx.weaknesses,
    strengths: ctx.strengths,
    lastInterviewType: lastInterview?.type,
    problemsSolved: accepted,
    weakTopics: dsa?.weakAreas,
  });

  const today = startOfDay();
  const [daily, weekly, monthly, activeGoal, milestones] = await Promise.all([
    prisma.dailyMission.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.weeklyMission.findUnique({ where: { userId_weekStart: { userId, weekStart: startOfWeek() } } }),
    prisma.monthlyMission.findUnique({ where: { userId_monthStart: { userId, monthStart: startOfMonth() } } }),
    prisma.careerGoal.findFirst({ where: { userId, status: "active" }, orderBy: { updatedAt: "desc" } }),
    prisma.careerMilestone.findMany({ where: { userId }, orderBy: { achievedAt: "desc" }, take: 5 }),
  ]);

  return {
    placementReadiness: ctx.placementReadiness,
    currentPotential: future.currentPotential,
    futurePotential: future.futurePotential,
    learningVelocity: velocity,
    placementForecast: predictions,
    dailyMission: daily,
    weeklyMission: weekly,
    monthlyMission: monthly,
    activeGoal,
    recentMilestones: milestones,
    twinSummary: {
      strengths: ctx.strengths,
      weaknesses: ctx.weaknesses,
      placementScore: ctx.twin.placementScore,
      codingReadiness: ctx.twin.codingReadiness,
      interviewReadiness: ctx.twin.interviewReadiness,
      panelReadiness: ctx.twin.panelReadiness,
    },
    readinessDelta,
    twinActivity,
    coachMessage,
    nextBestActions: nextActions,
    codingOs: dsa
      ? {
          weakAreas: dsa.weakAreas,
          recommendedNext: dsa.recommendedNext,
          problemsSolved: accepted,
        }
      : { problemsSolved: accepted },
  };
}

export async function generateMissions(userId: string) {
  const ctx = await gatherCareerOSContext(userId);
  const missionInput = {
    weaknesses: ctx.weaknesses,
    strengths: ctx.strengths,
    codingReadiness: ctx.twin.codingReadiness,
    interviewReadiness: ctx.twin.interviewReadiness,
    technicalScore: ctx.twin.technicalScore,
    githubScore: ctx.twin.githubScore,
    leetcodeScore: ctx.twin.leetcodeScore,
    professionalReadiness: ctx.twin.professionalReadiness,
    targetRole: ctx.targetRole,
    roadmapPending: ctx.roadmapPending,
    interviewImprovements: ctx.interviewImprovements,
  };

  const daily = generateDailyMission(missionInput);
  const weekly = generateWeeklyMission(missionInput);
  const monthly = generateMonthlyMission(missionInput);
  const twinFactors = { weaknesses: ctx.weaknesses, strengths: ctx.strengths, targetRole: ctx.targetRole };

  const today = startOfDay();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const [dailyRow, weeklyRow, monthlyRow] = await Promise.all([
    prisma.dailyMission.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, title: daily.title, tasks: daily.tasks as object, twinFactors: twinFactors as object },
      update: { title: daily.title, tasks: daily.tasks as object, twinFactors: twinFactors as object },
    }),
    prisma.weeklyMission.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, title: weekly.title, tasks: weekly.tasks as object, twinFactors: twinFactors as object },
      update: { title: weekly.title, tasks: weekly.tasks as object, twinFactors: twinFactors as object },
    }),
    prisma.monthlyMission.upsert({
      where: { userId_monthStart: { userId, monthStart } },
      create: { userId, monthStart, title: monthly.title, tasks: monthly.tasks as object, twinFactors: twinFactors as object },
      update: { title: monthly.title, tasks: monthly.tasks as object, twinFactors: twinFactors as object },
    }),
  ]);

  await recordProgressSnapshot(userId, ctx);

  return { daily: dailyRow, weekly: weeklyRow, monthly: monthlyRow };
}

async function computeAndPersistLearningVelocity(userId: string, ctx: Awaited<ReturnType<typeof gatherCareerOSContext>>) {
  const velocitySnaps = ctx.placementHistory.map((p) => ({
    date: p.computedAt,
    technical: ctx.twin.technicalScore,
    coding: p.codingReadiness || 0,
    interview: p.interviewReadiness || 0,
    professional: ctx.twin.professionalReadiness,
  }));

  const cv = computeCareerVelocity({ snapshots: velocitySnaps });
  const w30 = cv.windows[0] || { skillGrowth: 0, codingGrowth: 0, interviewGrowth: 0, professionalGrowth: 0 };

  const learning = computeLearningVelocity({
    skillGrowth: w30.skillGrowth,
    codingGrowth: w30.codingGrowth,
    interviewGrowth: w30.interviewGrowth,
    professionalGrowth: w30.professionalGrowth,
    consistencyDays: Math.min(14, ctx.usageEvents),
  });

  await prisma.learningVelocitySnapshot.create({
    data: {
      userId,
      score: learning.score,
      tier: learning.tier,
      skillGrowth: learning.skillGrowth,
      codingGrowth: learning.codingGrowth,
      interviewGrowth: learning.interviewGrowth,
      professionalGrowth: learning.professionalGrowth,
      factors: { reasoning: learning.reasoning } as object,
    },
  });

  return learning;
}

async function computeAndPersistFuturePotential(
  userId: string,
  ctx: Awaited<ReturnType<typeof gatherCareerOSContext>>,
  learningVelocityScore: number
) {
  const growth = computeGrowthPotential({
    interviewTrend: Math.max(0, trendDelta(ctx.placementHistory.map((p) => p.interviewReadiness || 0)) * 5 + 50),
    codingTrend: Math.max(0, trendDelta(ctx.placementHistory.map((p) => p.codingReadiness || 0)) * 5 + 50),
    roadmapCompletion: 50,
    githubGrowth: ctx.twin.githubScore * 0.5,
    coachEngagement: Math.min(100, ctx.coachEngagement * 15),
    learningConsistency: Math.min(100, ctx.usageEvents * 5),
  });

  const future = computeFuturePotential({
    placementReadiness: ctx.placementReadiness,
    growthPotentialScore: growth.score,
    learningVelocityScore,
    coachEngagement: ctx.coachEngagement,
    projectActivity: ctx.twin.portfolioStrength,
    consistencyScore: Math.min(100, ctx.usageEvents * 6),
    panelReadiness: ctx.twin.panelReadiness,
    strengths: ctx.strengths,
  });

  await prisma.futurePotentialSnapshot.create({
    data: {
      userId,
      currentPotential: future.currentPotential,
      futurePotential: future.futurePotential,
      growthCeiling: future.growthCeiling,
      leadershipPotential: future.leadershipPotential,
      technicalPotential: future.technicalPotential,
      tier: future.tier,
      factors: { reasoning: future.reasoning } as object,
    },
  });

  return future;
}

async function computeAndPersistPredictions(
  userId: string,
  ctx: Awaited<ReturnType<typeof gatherCareerOSContext>>,
  learningVelocityScore: number
) {
  const maxStreak = ctx.habits.reduce((m, h) => Math.max(m, h.streak), 0);
  const horizons = [30, 60, 90] as const;
  const results = [];

  for (const horizonDays of horizons) {
    const pred = computePlacementPrediction({
      placementReadiness: ctx.placementReadiness,
      interviewReadiness: ctx.twin.interviewReadiness,
      codingReadiness: ctx.twin.codingReadiness,
      professionalReadiness: ctx.twin.professionalReadiness,
      learningVelocityScore,
      habitStreak: maxStreak,
      coachEngagement: ctx.coachEngagement,
      weaknesses: ctx.weaknesses,
      horizonDays,
    });

    await prisma.placementPrediction.create({
      data: {
        userId,
        horizonDays,
        probability: pred.probability,
        confidence: pred.confidence,
        improves: pred.improves as object,
        reduces: pred.reduces as object,
        factors: { reasoning: pred.reasoning } as object,
      },
    });
    results.push(pred);
  }
  return results;
}

export async function recordProgressSnapshot(userId: string, ctx?: Awaited<ReturnType<typeof gatherCareerOSContext>>) {
  const c = ctx || (await gatherCareerOSContext(userId));
  return prisma.progressSnapshot.create({
    data: {
      userId,
      placementReadiness: c.placementReadiness,
      technicalScore: c.twin.technicalScore,
      codingScore: c.twin.codingReadiness,
      interviewScore: c.twin.interviewReadiness,
      professionalScore: c.twin.professionalReadiness,
      factors: { weaknesses: c.weaknesses, strengths: c.strengths } as object,
    },
  });
}

export async function createCareerGoal(userId: string, data: { templateId?: string; customTitle?: string; targetRole?: string }) {
  const template = GOAL_TEMPLATES.find((g) => g.id === data.templateId) || GOAL_TEMPLATES[7];
  const targetRole = data.targetRole || template.targetRole;
  const title = data.customTitle || template.title;

  const roadmap = [
    { phase: "Foundation", items: ["Complete skill gap analysis", "Sync professional profiles", "Baseline mock interview"] },
    { phase: "Build", items: ["Daily coding missions", "2 projects for portfolio", "System design prep"] },
    { phase: "Place", items: ["Panel interview readiness ≥70", "ATS resume ≥85", "Apply to target companies"] },
  ];

  await prisma.careerGoal.updateMany({ where: { userId, status: "active" }, data: { status: "archived" } });

  return prisma.careerGoal.create({
    data: { userId, title, targetRole, category: template.id, roadmap: roadmap as object },
  });
}

export async function listGoals(userId: string) {
  return prisma.careerGoal.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { milestones: true } });
}

export async function getHabits(userId: string) {
  const habits = await prisma.habitTracker.findMany({ where: { userId } });
  if (habits.length) return habits;

  const defaults = ["daily_learning", "coding_streak", "interview_practice", "profile_updates", "project_activity"];
  for (const habitType of defaults) {
    await prisma.habitTracker.create({ data: { userId, habitType, streak: 0 } });
  }
  return prisma.habitTracker.findMany({ where: { userId } });
}

export async function logHabit(userId: string, habitType: string) {
  const existing = await prisma.habitTracker.findUnique({ where: { userId_habitType: { userId, habitType } } });
  const now = new Date();
  const last = existing?.lastActiveAt;
  let streak = existing?.streak || 0;
  if (last) {
    const daysSince = Math.floor((now.getTime() - last.getTime()) / 86400000);
    streak = daysSince <= 1 ? streak + 1 : 1;
  } else {
    streak = 1;
  }

  return prisma.habitTracker.upsert({
    where: { userId_habitType: { userId, habitType } },
    create: { userId, habitType, streak, lastActiveAt: now, weeklyCount: 1 },
    update: { streak, lastActiveAt: now, weeklyCount: { increment: 1 } },
  });
}

export async function getHabitCoaching(userId: string) {
  const habits = await getHabits(userId);
  const reminders: string[] = [];
  for (const h of habits) {
    if (h.streak === 0) reminders.push(`Start your ${h.habitType.replace(/_/g, " ")} habit today — twin shows gaps without consistency`);
    else if (h.streak >= 7) reminders.push(`🔥 ${h.streak}-day ${h.habitType.replace(/_/g, " ")} streak — keep momentum!`);
    else reminders.push(`Continue ${h.habitType.replace(/_/g, " ")} — ${7 - h.streak} days to weekly milestone`);
  }
  return { habits, reminders };
}

export async function checkAndAwardMilestones(userId: string) {
  const ctx = await gatherCareerOSContext(userId);
  const awarded: string[] = [];

  const checks = [
    { key: "placement_70", title: "Placement Ready 70+", category: "placement", pass: ctx.placementReadiness >= 70, badge: "🎯" },
    { key: "interview_65", title: "Interview Ready 65+", category: "interview", pass: ctx.twin.interviewReadiness >= 65, badge: "🎤" },
    { key: "coding_60", title: "Coding Ready 60+", category: "coding", pass: ctx.twin.codingReadiness >= 60, badge: "💻" },
    { key: "github_50", title: "GitHub Profile 50+", category: "professional", pass: ctx.twin.githubScore >= 50, badge: "🐙" },
    { key: "streak_7", title: "7-Day Learning Streak", category: "habit", pass: ctx.habits.some((h) => h.streak >= 7), badge: "🔥" },
  ];

  for (const c of checks) {
    if (!c.pass) continue;
    const exists = await prisma.careerMilestone.findFirst({ where: { userId, title: c.title } });
    if (!exists) {
      await prisma.careerMilestone.create({
        data: { userId, title: c.title, category: c.category, badge: c.badge, metadata: { key: c.key } as object },
      });
      awarded.push(c.title);
    }
  }
  return awarded;
}

export async function getAchievements(userId: string) {
  await checkAndAwardMilestones(userId);
  return prisma.careerMilestone.findMany({ where: { userId }, orderBy: { achievedAt: "desc" } });
}

export async function getProgressHistory(userId: string, limit = 20) {
  return prisma.progressSnapshot.findMany({ where: { userId }, orderBy: { computedAt: "desc" }, take: limit });
}

export { GOAL_TEMPLATES };
