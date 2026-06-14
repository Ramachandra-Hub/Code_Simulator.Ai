import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { judge0Client, type Judge0Result } from "../integrations/judge0-client";
import {
  evaluateCodeHeuristic,
  type CodingHeuristicEvaluation,
  type CodingProblemSpec,
} from "../evaluators/coding-evaluator";
import { llmPromptJson } from "../prompts/agent-llm";
import { CodingDiscussionSchema } from "../prompts/schemas";

const CodingState = Annotation.Root({
  sessionId: Annotation<string>,
  userId: Annotation<string>,
  problem: Annotation<CodingProblemSpec>,
  code: Annotation<string>,
  language: Annotation<string>,
  stdin: Annotation<string | undefined>,
  judge0Result: Annotation<Judge0Result | null>,
  heuristic: Annotation<CodingHeuristicEvaluation | null>,
  discussionQuestions: Annotation<string[]>,
  openingPrompt: Annotation<string>,
  feedback: Annotation<string>,
  actionableSteps: Annotation<string[]>,
  discussionValid: Annotation<boolean>,
  phase: Annotation<"coding" | "submitted" | "discussion" | "complete">,
});

type State = typeof CodingState.State;

async function judge0EvaluateNode(state: State): Promise<Partial<State>> {
  const result = await judge0Client.submit(state.code, state.language, state.stdin);
  return { judge0Result: result, phase: "submitted" };
}

async function heuristicScoreNode(state: State): Promise<Partial<State>> {
  if (!state.judge0Result) return { heuristic: null };
  const heuristic = evaluateCodeHeuristic(state.code, state.judge0Result, state.problem);
  return { heuristic };
}

async function discussionNode(state: State): Promise<Partial<State>> {
  const h = state.heuristic;
  const fallback = {
    questions: [
      "Why did you choose this approach?",
      "What is the time complexity of your solution?",
      "What is the space complexity?",
      "What edge cases did you consider?",
      "How would you optimize this further?",
    ],
    openingPrompt: `Your code received verdict: ${h?.verdict || "Unknown"}. Let's discuss your solution.`,
    feedback: h?.passed
      ? "Good work passing the tests. Let's deepen our understanding of your approach."
      : "The solution did not pass all tests. Walk me through your thinking and how you'd fix it.",
    actionableSteps: h?.passed
      ? ["Practice similar problems", "Analyze complexity trade-offs"]
      : ["Debug failing cases", "Review algorithm fundamentals", "Add edge case tests"],
  };

  const { data, valid } = await llmPromptJson(
    "coding",
    "discussion",
    {
      problemTitle: state.problem.title,
      language: state.language,
      code: state.code.slice(0, 3000),
      verdict: h?.verdict || "Unknown",
      correctnessScore: h?.correctnessScore ?? 0,
      timeComplexity: h?.timeComplexity || "unknown",
      spaceComplexity: h?.spaceComplexity || "unknown",
      overallScore: h?.overallScore ?? 0,
    },
    CodingDiscussionSchema,
    fallback
  );

  return {
    discussionQuestions: data.questions,
    openingPrompt: data.openingPrompt,
    feedback: data.feedback,
    actionableSteps: data.actionableSteps,
    discussionValid: valid,
    phase: "discussion",
  };
}

export function buildCodingSubmitGraph() {
  return new StateGraph(CodingState)
    .addNode("judge0_evaluate", judge0EvaluateNode)
    .addNode("heuristic_score", heuristicScoreNode)
    .addNode("generate_discussion", discussionNode)
    .addEdge(START, "judge0_evaluate")
    .addEdge("judge0_evaluate", "heuristic_score")
    .addEdge("heuristic_score", "generate_discussion")
    .addEdge("generate_discussion", END)
    .compile();
}

let cachedSubmitGraph: ReturnType<typeof buildCodingSubmitGraph> | null = null;
function getCodingSubmitGraph() {
  if (!cachedSubmitGraph) cachedSubmitGraph = buildCodingSubmitGraph();
  return cachedSubmitGraph;
}

export interface RunCodingSubmitInput {
  sessionId: string;
  userId: string;
  problem: CodingProblemSpec;
  code: string;
  language: string;
  stdin?: string;
}

export interface RunCodingSubmitResult {
  judge0Result: Judge0Result;
  heuristic: CodingHeuristicEvaluation;
  discussionQuestions: string[];
  openingPrompt: string;
  feedback: string;
  actionableSteps: string[];
  discussionValid: boolean;
  phase: "discussion";
}

export async function runCodingSubmit(input: RunCodingSubmitInput): Promise<RunCodingSubmitResult> {
  const graph = getCodingSubmitGraph();
  const result = (await graph.invoke({
    ...input,
    judge0Result: null,
    heuristic: null,
    discussionQuestions: [],
    openingPrompt: "",
    feedback: "",
    actionableSteps: [],
    discussionValid: false,
    phase: "coding",
  })) as State;

  return {
    judge0Result: result.judge0Result!,
    heuristic: result.heuristic!,
    discussionQuestions: result.discussionQuestions,
    openingPrompt: result.openingPrompt,
    feedback: result.feedback,
    actionableSteps: result.actionableSteps,
    discussionValid: result.discussionValid,
    phase: "discussion",
  };
}

export async function runCodeExecution(code: string, language: string, stdin?: string) {
  return judge0Client.submit(code, language, stdin);
}
