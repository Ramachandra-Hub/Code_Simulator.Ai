import { agentRegistry } from "../../core/agent/agent-registry";
import { createAgent } from "../../career-intelligence/agents/agent-builder";
import {
  gatherCareerOSContext,
  generateMissions,
  getCareerOSOverview,
  createCareerGoal,
  getHabitCoaching,
  getAchievements,
  recordProgressSnapshot,
} from "../services/career-os-service";
import { computePlacementPrediction } from "../engines/placement-prediction-engine";
import { computeLearningVelocity } from "../engines/learning-velocity-engine";
import { computeFuturePotential } from "../engines/future-potential-engine";
import { computeGrowthPotential } from "../../talent/engines/growth-potential-engine";

export function registerCareerOSAgents(): void {
  const agents = [
    createAgent(
      { id: "career-manager", name: "CareerManagerAgent", objective: "Orchestrate daily career actions from Digital Twin", category: "career-os", tools: ["digital-twin", "missions"], evaluationRules: ["twin-first"] },
      async (_input, ctx) => {
        const userId = ctx.userId!;
        const overview = await getCareerOSOverview(userId);
        return { result: { message: "What exactly should you do today?", overview }, confidence: 0.9 };
      }
    ),
    createAgent(
      { id: "goal-planner", name: "GoalPlannerAgent", objective: "Plan career goals and roadmaps from twin signals", category: "career-os", tools: ["goals", "roadmap"], evaluationRules: ["goal-aligned"] },
      async (input, ctx) => {
        const userId = ctx.userId!;
        const goal = await createCareerGoal(userId, {
          templateId: input.templateId as string,
          customTitle: input.customTitle as string,
          targetRole: input.targetRole as string,
        });
        return { result: { goal }, confidence: 0.88 };
      }
    ),
    createAgent(
      { id: "task-planner", name: "TaskPlannerAgent", objective: "Generate daily/weekly/monthly missions from twin gaps", category: "career-os", tools: ["missions"], evaluationRules: ["actionable"] },
      async (_input, ctx) => {
        const missions = await generateMissions(ctx.userId!);
        return { result: missions, confidence: 0.91 };
      }
    ),
    createAgent(
      { id: "habit-coach", name: "HabitCoachAgent", objective: "Track habits and generate coaching reminders", category: "career-os", tools: ["habits"], evaluationRules: ["consistency"] },
      async (_input, ctx) => {
        const coaching = await getHabitCoaching(ctx.userId!);
        return { result: coaching, confidence: 0.87 };
      }
    ),
    createAgent(
      { id: "progress-tracking", name: "ProgressTrackingAgent", objective: "Snapshot and track career progress from twin", category: "career-os", tools: ["progress"], evaluationRules: ["measurable"] },
      async (_input, ctx) => {
        const snap = await recordProgressSnapshot(ctx.userId!);
        return { result: snap, confidence: 0.89 };
      }
    ),
    createAgent(
      { id: "placement-prediction", name: "PlacementPredictionAgent", objective: "Predict placement probability horizons", category: "career-os", tools: ["prediction"], evaluationRules: ["explainable"] },
      async (_input, ctx) => {
        const c = await gatherCareerOSContext(ctx.userId!);
        const pred = computePlacementPrediction({
          placementReadiness: c.placementReadiness,
          interviewReadiness: c.twin.interviewReadiness,
          codingReadiness: c.twin.codingReadiness,
          professionalReadiness: c.twin.professionalReadiness,
          learningVelocityScore: 55,
          habitStreak: c.habits.reduce((m, h) => Math.max(m, h.streak), 0),
          coachEngagement: c.coachEngagement,
          weaknesses: c.weaknesses,
          horizonDays: 30,
        });
        return { result: pred, confidence: pred.confidence };
      }
    ),
    createAgent(
      { id: "learning-velocity", name: "LearningVelocityAgent", objective: "Measure learning acceleration from twin trends", category: "career-os", tools: ["velocity"], evaluationRules: ["trend-based"] },
      async (_input, ctx) => {
        const c = await gatherCareerOSContext(ctx.userId!);
        const lv = computeLearningVelocity({
          skillGrowth: 10,
          codingGrowth: 12,
          interviewGrowth: 8,
          professionalGrowth: 6,
          consistencyDays: Math.min(14, c.usageEvents),
        });
        return { result: lv, confidence: 0.86 };
      }
    ),
    createAgent(
      { id: "future-potential", name: "FuturePotentialAgent", objective: "Estimate future career potential from twin history", category: "career-os", tools: ["potential"], evaluationRules: ["forward-looking"] },
      async (_input, ctx) => {
        const c = await gatherCareerOSContext(ctx.userId!);
        const growth = computeGrowthPotential({
          interviewTrend: 55,
          codingTrend: 55,
          roadmapCompletion: 40,
          githubGrowth: c.twin.githubScore * 0.5,
          coachEngagement: c.coachEngagement * 15,
          learningConsistency: c.usageEvents * 5,
        });
        const fp = computeFuturePotential({
          placementReadiness: c.placementReadiness,
          growthPotentialScore: growth.score,
          learningVelocityScore: 55,
          coachEngagement: c.coachEngagement,
          projectActivity: c.twin.portfolioStrength,
          consistencyScore: c.usageEvents * 6,
          panelReadiness: c.twin.panelReadiness,
          strengths: c.strengths,
        });
        return { result: fp, confidence: 0.88 };
      }
    ),
  ];

  for (const a of agents) {
    agentRegistry.register(a);
  }
}
