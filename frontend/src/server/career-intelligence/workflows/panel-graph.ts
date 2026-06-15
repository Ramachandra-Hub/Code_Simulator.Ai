import { llmPromptJson } from "../prompts/agent-llm";
import { QuestionGenerationSchema } from "../prompts/schemas";
import { evaluateResponse } from "../evaluators/response-evaluator";
import {
  runPanelModerator,
  buildPanelQuestionPrompt,
  type ModeratorDecision,
} from "../agents/panel-moderator-agent";
import { evaluatePanelistTurn } from "../evaluators/panel-evaluation-evaluator";
import { normalizePanelQuestion } from "@/lib/speech-sanitize";
import { MNC_PANEL_ROSTER, MODERATOR_NAME, type PanelPersonaConfig } from "../panel/panel-personas";
import { isEchoOfAnswer, pickFromPool } from "../panel/panel-question-utils";
import { QUESTION_BANK } from "../knowledge/question-bank";
import { extractEarlierAnswerSnippet } from "../services/interview-realism";

export interface PanelTurnResult {
  decision: ModeratorDecision;
  question: string;
  speaker: PanelPersonaConfig;
  evaluation: ReturnType<typeof evaluatePanelistTurn>;
  answerAnalysis: ReturnType<typeof evaluateResponse>;
  interrupted: boolean;
}

const PERSONA_BANK: Record<string, string[]> = {
  hr: QUESTION_BANK.hr,
  technical_lead: QUESTION_BANK.technical,
  engineering_manager: QUESTION_BANK.behavioral,
  director: [...QUESTION_BANK.behavioral, ...QUESTION_BANK.system_design],
  recruiter: QUESTION_BANK.hr,
};

const ACTION_GUIDE: Record<ModeratorDecision["action"], string> = {
  question: "Ask a new interview question appropriate to your role.",
  follow_up: "Ask a sharp follow-up on the candidate's last answer — probe deeper, do not repeat their words.",
  interrupt: "Politely interrupt and redirect — the answer was vague. Ask for specifics.",
  challenge: "Challenge the candidate's claim. Ask for metrics, trade-offs, or evidence.",
  cross_question:
    "Reference something the candidate said earlier in the transcript, then ask one focused question.",
};

function buildFallbackQuestion(opts: {
  persona: PanelPersonaConfig;
  action: ModeratorDecision["action"];
  earlierSnippet?: string | null;
  asked: Set<string>;
}): string {
  const prefix =
    opts.action === "interrupt"
      ? "Let me stop you there — "
      : opts.action === "challenge"
        ? "I'd like to push back on that — "
        : opts.action === "cross_question" && opts.earlierSnippet
          ? `Earlier you mentioned ${opts.earlierSnippet.replace(/\.$/, "")} — `
          : "";

  const pool = PERSONA_BANK[opts.persona.persona] || QUESTION_BANK.technical;
  const picked = pickFromPool(pool, opts.asked);
  const base =
    picked ||
    pickFromPool([...QUESTION_BANK.technical, ...QUESTION_BANK.behavioral, ...QUESTION_BANK.hr], opts.asked) ||
    "What is your strongest technical achievement and what was your personal contribution?";

  if (opts.action === "cross_question" && opts.earlierSnippet && !prefix) {
    return normalizePanelQuestion(
      `Earlier you mentioned ${opts.earlierSnippet.replace(/\.$/, "")} — can you walk me through your specific contribution?`
    );
  }

  return normalizePanelQuestion(prefix + base);
}

function isValidQuestion(q: string, answer: string, asked: Set<string>): boolean {
  if (!q || q.length < 12) return false;
  if (asked.has(q)) return false;
  if (isEchoOfAnswer(q, answer)) return false;
  return true;
}

export async function generatePanelQuestion(opts: {
  persona: PanelPersonaConfig;
  action: ModeratorDecision["action"];
  targetRole: string;
  answer: string;
  recentTranscript: string;
  interrupted: boolean;
  earlierSnippet?: string | null;
  askedQuestions: string[];
  userId: string;
  sessionId: string;
}): Promise<string> {
  const asked = new Set(opts.askedQuestions);
  const actionGuide = ACTION_GUIDE[opts.action];
  const contextLine = opts.earlierSnippet ? `Earlier answer snippet to reference: "${opts.earlierSnippet}"` : "";

  try {
    const { data, valid } = await llmPromptJson(
      "panel",
      "question-generation",
      {
        panelistName: opts.persona.name,
        panelistRole: opts.persona.role,
        personality: opts.persona.personality,
        expertise: opts.persona.expertise.join(", "),
        questioningStyle: opts.persona.questioningStyle,
        targetRole: opts.targetRole,
        actionGuide,
        interruptedNote: opts.interrupted ? "You are interrupting the candidate." : "",
        contextLine,
        asked: JSON.stringify([...asked]),
        recentTranscript: opts.recentTranscript,
        answer: opts.answer.slice(0, 1500),
      },
      QuestionGenerationSchema,
      { question: "", difficulty: "medium" as const }
    );

    const q = data.question?.trim();
    if (valid && q && isValidQuestion(normalizePanelQuestion(q), opts.answer, asked)) {
      return normalizePanelQuestion(q);
    }
  } catch {
    // bank fallback below
  }

  return buildFallbackQuestion({
    persona: opts.persona,
    action: opts.action,
    earlierSnippet: opts.earlierSnippet,
    asked,
  });
}

export async function runPanelTurnGraph(opts: {
  sessionId: string;
  userId: string;
  targetRole: string;
  answer: string;
  panel: Array<{
    id: string;
    persona: string;
    name: string;
    role: string;
    lastSpokeAt?: Date | null;
    evaluation?: Record<string, unknown> | null;
  }>;
  recentTranscript: Array<{ speaker: string; text: string; role: string }>;
  askedQuestions: string[];
  turnCount: number;
  maxTurns: number;
  lastQuestion: string;
  skills?: string[];
}): Promise<PanelTurnResult> {
  const answerAnalysis = evaluateResponse(opts.lastQuestion, opts.answer, opts.skills || [], "panel");

  const decision = runPanelModerator({
    panel: opts.panel.map((p) => ({
      id: p.id,
      persona: p.persona,
      name: p.name,
      role: p.role,
      lastSpokeAt: p.lastSpokeAt?.toISOString() || null,
      lastScore: (p.evaluation as { overall?: number })?.overall,
    })),
    answer: opts.answer,
    answerScore: answerAnalysis.scores.overall,
    turnCount: opts.turnCount,
    maxTurns: opts.maxTurns,
    recentTranscript: opts.recentTranscript,
    targetRole: opts.targetRole,
  });

  const panelMember = opts.panel.find((p) => p.id === decision.nextSpeakerId);
  const personaConfig =
    MNC_PANEL_ROSTER.find((p) => p.persona === (panelMember?.persona || decision.nextSpeakerPersona)) ||
    MNC_PANEL_ROSTER[0];

  const transcriptText = opts.recentTranscript
    .slice(-8)
    .map((t) => `${t.speaker}: ${t.text}`)
    .join("\n");

  const earlierSnippet =
    decision.action === "cross_question" || decision.action === "follow_up"
      ? extractEarlierAnswerSnippet(opts.recentTranscript)
      : null;

  const question = await generatePanelQuestion({
    persona: personaConfig,
    action: decision.action,
    targetRole: opts.targetRole,
    answer: opts.answer,
    recentTranscript: transcriptText,
    interrupted: decision.interrupted,
    earlierSnippet,
    askedQuestions: opts.askedQuestions,
    userId: opts.userId,
    sessionId: opts.sessionId,
  });

  const evaluation = evaluatePanelistTurn({
    panelistId: decision.nextSpeakerId,
    name: personaConfig.name,
    role: personaConfig.role,
    persona: personaConfig.persona,
    answer: opts.answer,
    answerScores: {
      technical: answerAnalysis.scores.depth,
      communication: answerAnalysis.scores.communication,
      confidence: answerAnalysis.scores.confidence,
      overall: answerAnalysis.scores.overall,
    },
    action: decision.action,
  });

  return {
    decision,
    question,
    speaker: personaConfig,
    evaluation,
    answerAnalysis,
    interrupted: decision.interrupted,
  };
}

export function getOpeningPanelMessage(targetRole: string): {
  moderator: string;
  firstQuestion: string;
  speaker: PanelPersonaConfig;
} {
  const hr = MNC_PANEL_ROSTER.find((p) => p.persona === "hr")!;
  const pool = PERSONA_BANK.hr;
  const firstFromBank = pool[Math.floor(Math.random() * pool.length)];
  return {
    moderator: `Welcome to your panel interview. ${hr.name} will ask the first question.`,
    firstQuestion: normalizePanelQuestion(
      firstFromBank ||
        `Please introduce yourself and tell us why you are interested in the ${targetRole} role.`
    ),
    speaker: hr,
  };
}

export { MNC_PANEL_ROSTER, MODERATOR_NAME };
