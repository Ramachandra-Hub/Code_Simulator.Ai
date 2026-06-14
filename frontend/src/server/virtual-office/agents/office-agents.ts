import { agentRegistry } from "../../core/agent/agent-registry";
import { createAgent } from "../../career-intelligence/agents/agent-builder";
import {
  getOfficeOverview,
  submitStandup,
  generateOfficeTasks,
  completeTask,
  submitCodeReview,
  completeMeeting,
  scheduleMeeting,
  runPerformanceReview,
  runPromotionAssessment,
  getOfficeAnalytics,
  getTodaysWork,
} from "../services/virtual-office-service";

export function registerOfficeAgents(): void {
  const agents = [
    createAgent(
      { id: "ceo", name: "CEOAgent", objective: "Set company vision and prioritize strategic outcomes", category: "virtual-office", tools: ["overview"], evaluationRules: ["strategic"] },
      async (_input, ctx) => {
        const overview = await getOfficeOverview(ctx.userId!);
        return {
          result: {
            message: "Welcome to the virtual company. Our north star is shipping customer value with excellence.",
            company: overview.session.company,
            priorities: ["Customer impact", "Engineering velocity", "Team growth"],
          },
          confidence: 0.9,
        };
      }
    ),
    createAgent(
      { id: "engineering-director", name: "EngineeringDirectorAgent", objective: "Own technical strategy and architecture direction", category: "virtual-office", tools: ["meetings", "architecture"], evaluationRules: ["scalable"] },
      async (input, ctx) => {
        const type = (input.meetingType as "design_review") || "design_review";
        const meeting = await scheduleMeeting(ctx.userId!, type);
        return { result: { meeting, guidance: "Focus on trade-offs, scale, and operational excellence." }, confidence: 0.88 };
      }
    ),
    createAgent(
      { id: "engineering-manager", name: "EngineeringManagerAgent", objective: "Run sprint planning and team delivery", category: "virtual-office", tools: ["meetings", "tasks"], evaluationRules: ["delivery"] },
      async (_input, ctx) => {
        const work = await getTodaysWork(ctx.userId!);
        const meeting = await scheduleMeeting(ctx.userId!, "sprint_planning");
        return { result: { meeting, pendingTasks: work.pending.length }, confidence: 0.87 };
      }
    ),
    createAgent(
      { id: "team-lead", name: "TeamLeadAgent", objective: "Unblock engineers and facilitate retrospectives", category: "virtual-office", tools: ["standups", "meetings"], evaluationRules: ["unblock"] },
      async (_input, ctx) => {
        const meeting = await scheduleMeeting(ctx.userId!, "retrospective");
        return { result: { meeting, tip: "Share blockers early — we optimize for flow, not heroics." }, confidence: 0.86 };
      }
    ),
    createAgent(
      { id: "senior-engineer", name: "SeniorEngineerAgent", objective: "Review code for design, scale, and failure modes", category: "virtual-office", tools: ["code-review"], evaluationRules: ["rigorous"] },
      async (input, ctx) => {
        const review = await submitCodeReview(ctx.userId!, {
          code: (input.code as string) || "// sample\nexport async function handler() {}",
          language: input.language as string,
        });
        return { result: review, confidence: 0.91 };
      }
    ),
    createAgent(
      { id: "qa", name: "QAAgent", objective: "Ensure quality through test strategy and regression coverage", category: "virtual-office", tools: ["tasks"], evaluationRules: ["quality"] },
      async (_input, ctx) => {
        const tasks = await generateOfficeTasks(ctx.userId!);
        return { result: { tasks, focus: "Add regression coverage for critical paths." }, confidence: 0.85 };
      }
    ),
    createAgent(
      { id: "product-manager", name: "ProductManagerAgent", objective: "Align backlog with customer outcomes", category: "virtual-office", tools: ["tasks", "meetings"], evaluationRules: ["customer-centric"] },
      async (_input, ctx) => {
        const overview = await getOfficeOverview(ctx.userId!);
        return { result: { todayWork: overview.todayWork, message: "Prioritize work that moves activation metrics." }, confidence: 0.87 };
      }
    ),
    createAgent(
      { id: "hr-business-partner", name: "HRBusinessPartnerAgent", objective: "Support growth, feedback, and promotion readiness", category: "virtual-office", tools: ["performance", "promotion"], evaluationRules: ["fair"] },
      async (input, ctx) => {
        const period = (input.period as "weekly" | "monthly") || "weekly";
        const review = await runPerformanceReview(ctx.userId!, period);
        return { result: review, confidence: 0.89 };
      }
    ),
    createAgent(
      { id: "client", name: "ClientAgent", objective: "Represent stakeholder needs in client meetings", category: "virtual-office", tools: ["meetings"], evaluationRules: ["stakeholder"] },
      async (_input, ctx) => {
        const meeting = await scheduleMeeting(ctx.userId!, "client");
        return {
          result: {
            meeting,
            questions: ["What's the ETA on the pilot?", "How do you handle failure scenarios at scale?"],
          },
          confidence: 0.84,
        };
      }
    ),
    createAgent(
      { id: "performance-review", name: "PerformanceReviewAgent", objective: "Synthesize weekly/monthly performance and promotion readiness", category: "virtual-office", tools: ["performance", "analytics"], evaluationRules: ["holistic"] },
      async (_input, ctx) => {
        const [weekly, promotion, analytics] = await Promise.all([
          runPerformanceReview(ctx.userId!, "weekly"),
          runPromotionAssessment(ctx.userId!),
          getOfficeAnalytics(ctx.userId!),
        ]);
        return { result: { weekly, promotion, analytics }, confidence: 0.92 };
      }
    ),
  ];

  for (const agent of agents) {
    agentRegistry.register(agent);
  }
}
