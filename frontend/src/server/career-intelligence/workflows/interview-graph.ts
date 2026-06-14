import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { AgentFactory } from "../../core/agent/agent-factory";
import { evaluateResponse, type ResponseEvaluation } from "../evaluators/response-evaluator";

const TurnState = Annotation.Root({
  sessionId: Annotation<string>,
  userId: Annotation<string>,
  type: Annotation<string>,
  question: Annotation<string>,
  answer: Annotation<string>,
  keywords: Annotation<string[]>,
  asked: Annotation<string[]>,
  bank: Annotation<string[]>,
  context: Annotation<Record<string, unknown>>,
  questionIndex: Annotation<number>,
  maxQuestions: Annotation<number>,
  followUpCount: Annotation<number>,
  maxFollowUps: Annotation<number>,
  difficulty: Annotation<string>,
  evaluation: Annotation<ResponseEvaluation>,
  followUp: Annotation<string | null>,
  nextQuestion: Annotation<string | null>,
  phase: Annotation<"follow_up" | "next_question" | "complete">,
});

type State = typeof TurnState.State;

async function analyzeNode(state: State): Promise<Partial<State>> {
  const heuristic = evaluateResponse(state.question, state.answer, state.keywords || [], state.type);

  const agent = AgentFactory.create("response-analysis");
  const output = await agent.run(
    { question: state.question, answer: state.answer, keywords: state.keywords, type: state.type },
    { userId: state.userId, sessionId: state.sessionId }
  );
  const result = output.result as ResponseEvaluation;

  const merged: ResponseEvaluation = {
    ...heuristic,
    answerType: result.answerType || heuristic.answerType,
    followUp: result.followUp || heuristic.followUp,
    signals: Array.from(new Set([...(result.signals || []), ...heuristic.signals])),
  };

  return { evaluation: merged };
}

async function decideNode(state: State): Promise<Partial<State>> {
  const evaluation = state.evaluation;
  const shouldFollowUp = !!evaluation.followUp && state.followUpCount < state.maxFollowUps;

  if (shouldFollowUp) {
    return { followUp: evaluation.followUp || null, phase: "follow_up" };
  }
  if (state.questionIndex + 1 >= state.maxQuestions) {
    return { phase: "complete", nextQuestion: null };
  }
  return { phase: "next_question" };
}

async function generateQuestionNode(state: State): Promise<Partial<State>> {
  let nextDifficulty = state.difficulty;
  const overall = state.evaluation?.scores?.overall ?? 60;
  if (overall >= 85) nextDifficulty = "hard";
  else if (overall < 50) nextDifficulty = "easy";

  const generator = AgentFactory.create("question-generation");
  const output = await generator.run(
    {
      type: state.type,
      context: { ...state.context, difficulty: nextDifficulty },
      asked: state.asked,
      bank: state.bank,
    },
    { userId: state.userId, sessionId: state.sessionId }
  );
  const question = (output.result as { question: string }).question;

  return { nextQuestion: question, difficulty: nextDifficulty };
}

function routeAfterDecide(state: State): "follow_up" | "next_question" | typeof END {
  if (state.phase === "follow_up") return "follow_up";
  if (state.phase === "complete") return END;
  return "next_question";
}

export function buildInterviewTurnGraph() {
  const graph = new StateGraph(TurnState)
    .addNode("analyze", analyzeNode)
    .addNode("decide", decideNode)
    .addNode("follow_up", async (s: State) => ({ phase: "follow_up" as const, nextQuestion: s.followUp }))
    .addNode("next_question", generateQuestionNode)
    .addEdge(START, "analyze")
    .addEdge("analyze", "decide")
    .addConditionalEdges("decide", routeAfterDecide, {
      follow_up: "follow_up",
      next_question: "next_question",
      [END]: END,
    })
    .addEdge("follow_up", END)
    .addEdge("next_question", END);

  return graph.compile();
}

let cached: ReturnType<typeof buildInterviewTurnGraph> | null = null;
export function getInterviewTurnGraph() {
  if (!cached) cached = buildInterviewTurnGraph();
  return cached;
}

export interface RunInterviewTurnInput {
  sessionId: string;
  userId: string;
  type: string;
  question: string;
  answer: string;
  keywords: string[];
  asked: string[];
  bank: string[];
  context: Record<string, unknown>;
  questionIndex: number;
  maxQuestions: number;
  followUpCount: number;
  maxFollowUps: number;
  difficulty: string;
}

export interface RunInterviewTurnResult {
  evaluation: ResponseEvaluation;
  phase: "follow_up" | "next_question" | "complete";
  nextQuestion: string | null;
  difficulty: string;
}

export async function runInterviewTurn(input: RunInterviewTurnInput): Promise<RunInterviewTurnResult> {
  const graph = getInterviewTurnGraph();
  const result = (await graph.invoke({
    ...input,
    evaluation: undefined as unknown as ResponseEvaluation,
    followUp: null,
    nextQuestion: null,
    phase: "next_question",
  })) as State;

  return {
    evaluation: result.evaluation,
    phase: result.phase,
    nextQuestion: result.nextQuestion ?? null,
    difficulty: result.difficulty,
  };
}
