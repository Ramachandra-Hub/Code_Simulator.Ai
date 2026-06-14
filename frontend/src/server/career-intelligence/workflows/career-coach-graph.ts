import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { llmPromptJson } from "../prompts/agent-llm";
import { CareerRecommendationsSchema, LearningRoadmapSchema } from "../prompts/schemas";
import {
  analyzeStudentHeuristic,
  computePlacementHeuristic,
  type HeuristicCareerAnalysis,
} from "../evaluators/career-metrics";
import type { StudentCoachContext } from "../services/career-coach-types";

const CoachState = Annotation.Root({
  userId: Annotation<string>,
  context: Annotation<StudentCoachContext>,
  analysis: Annotation<HeuristicCareerAnalysis | null>,
  recommendations: Annotation<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: Array<{ title: string; description: string; priority: string; category?: string }>;
    focusAreas: string[];
    source: string;
  } | null>,
  roadmap: Annotation<{
    title: string;
    summary: string;
    items: Array<{ title: string; type: string; priority: number; estimatedWeeks?: number; description?: string }>;
    source: string;
  } | null>,
  placement: Annotation<{ placementReadiness: number; hiringProbability: string; source: string } | null>,
});

type State = typeof CoachState.State;

async function analyzeNode(state: State): Promise<Partial<State>> {
  const ctx = state.context;
  const analysis = analyzeStudentHeuristic(ctx.profile, {
    resumeScore: ctx.resumeScore,
    interviewScore: ctx.latestInterviewScore,
    confidenceScore: ctx.confidenceScore,
    codingScore: ctx.latestCodingScore,
  });
  return { analysis };
}

async function recommendationsNode(state: State): Promise<Partial<State>> {
  const a = state.analysis!;
  const ctx = state.context;
  const fallback = {
    summary: `Placement readiness is ${a.placementScore}/100. Focus on top skill gaps.`,
    strengths: a.strengths.length ? a.strengths : ["Engaged with the platform"],
    weaknesses: a.weaknesses.length ? a.weaknesses : ["Complete more assessments"],
    recommendations: Object.entries(a.skillGaps).slice(0, 4).map(([k, gap]) => ({
      title: `Improve ${k.replace(/_/g, " ")}`,
      description: `Close ${gap} point gap to reach placement target`,
      priority: gap > 20 ? "high" as const : "medium" as const,
      category: k,
    })),
    focusAreas: Object.keys(a.skillGaps).slice(0, 5),
  };

  const { data, valid, source } = await llmPromptJson(
    "career",
    "recommendations",
    {
      metrics: JSON.stringify(a.metrics),
      weaknesses: JSON.stringify(a.weaknesses),
      skillGaps: JSON.stringify(a.skillGaps),
      targetRole: ctx.targetRole,
      resumeScore: ctx.resumeScore,
      interviewScore: ctx.latestInterviewScore,
      codingSummary: JSON.stringify(ctx.codingEvaluations.slice(0, 3)),
      githubSummary: ctx.githubSummary,
      linkedinSummary: ctx.linkedinSummary,
      leetcodeSummary: ctx.leetcodeSummary,
      hackerrankSummary: ctx.hackerrankSummary,
      professionalScores: JSON.stringify(ctx.professionalScores),
    },
    CareerRecommendationsSchema,
    fallback
  );

  const recommendations = (data.recommendations ?? fallback.recommendations).map((r) => ({
    title: r.title,
    description: r.description,
    category: r.category,
    priority: r.priority ?? "medium",
  }));

  return {
    recommendations: {
      summary: data.summary ?? fallback.summary,
      strengths: data.strengths ?? fallback.strengths,
      weaknesses: data.weaknesses ?? fallback.weaknesses,
      focusAreas: data.focusAreas ?? fallback.focusAreas,
      recommendations,
      source: valid ? `llm-${source}` : "heuristic-fallback",
    },
  };
}

async function roadmapNode(state: State): Promise<Partial<State>> {
  const a = state.analysis!;
  const recs = state.recommendations!;
  const ctx = state.context;

  const fallback = {
    title: `${ctx.targetRole} Placement Roadmap`,
    summary: "Structured plan based on your skill gaps",
    items: Object.keys(a.skillGaps).slice(0, 5).map((k, i) => ({
      title: `Practice ${k.replace(/_/g, " ")}`,
      type: k.includes("coding") || k.includes("algorithm") ? "practice" as const : "interview" as const,
      priority: i + 1,
      estimatedWeeks: 2,
      description: `Close gap in ${k}`,
    })),
  };

  const { data, valid, source } = await llmPromptJson(
    "career",
    "roadmap",
    {
      targetRole: ctx.targetRole,
      skillGaps: JSON.stringify(a.skillGaps),
      recommendations: JSON.stringify(recs.recommendations.slice(0, 5)),
      placementScore: a.placementScore,
    },
    LearningRoadmapSchema,
    fallback
  );

  const items = (data.items ?? fallback.items).map((item, i) => ({
    title: item.title,
    type: item.type ?? "practice",
    priority: item.priority ?? i + 1,
    estimatedWeeks: item.estimatedWeeks,
    description: item.description,
  }));

  return {
    roadmap: {
      title: data.title ?? fallback.title,
      summary: data.summary ?? fallback.summary,
      items,
      source: valid ? `llm-${source}` : "heuristic-fallback",
    },
  };
}

async function placementNode(state: State): Promise<Partial<State>> {
  const metrics = state.analysis!.metrics;
  const placement = computePlacementHeuristic(metrics);
  return {
    placement: {
      ...placement,
      source: "heuristic",
    },
  };
}

export function buildCareerCoachGraph() {
  return new StateGraph(CoachState)
    .addNode("analyze_student", analyzeNode)
    .addNode("identify_weaknesses", async () => ({}))
    .addNode("generate_recommendations", recommendationsNode)
    .addNode("build_roadmap", roadmapNode)
    .addNode("placement_readiness", placementNode)
    .addEdge(START, "analyze_student")
    .addEdge("analyze_student", "identify_weaknesses")
    .addEdge("identify_weaknesses", "generate_recommendations")
    .addEdge("generate_recommendations", "build_roadmap")
    .addEdge("build_roadmap", "placement_readiness")
    .addEdge("placement_readiness", END)
    .compile();
}

let cached: ReturnType<typeof buildCareerCoachGraph> | null = null;
export function getCareerCoachGraph() {
  if (!cached) cached = buildCareerCoachGraph();
  return cached;
}

export interface CareerCoachGraphResult {
  analysis: HeuristicCareerAnalysis;
  recommendations: NonNullable<State["recommendations"]>;
  roadmap: NonNullable<State["roadmap"]>;
  placement: NonNullable<State["placement"]>;
}

export async function runCareerCoachGraph(
  userId: string,
  context: StudentCoachContext
): Promise<CareerCoachGraphResult> {
  const graph = getCareerCoachGraph();
  const result = (await graph.invoke({
    userId,
    context,
    analysis: null,
    recommendations: null,
    roadmap: null,
    placement: null,
  })) as State;

  return {
    analysis: result.analysis!,
    recommendations: result.recommendations!,
    roadmap: result.roadmap!,
    placement: result.placement!,
  };
}
