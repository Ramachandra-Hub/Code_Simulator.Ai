import { AgentFactory } from "../../core/agent/agent-factory";
import { evaluateResponse } from "../evaluators/response-evaluator";
import {
  runPanelModerator,
  buildPanelQuestionPrompt,
  type ModeratorDecision,
} from "../agents/panel-moderator-agent";
import { evaluatePanelistTurn } from "../evaluators/panel-evaluation-evaluator";
import { normalizePanelQuestion } from "@/lib/speech-sanitize";
import { MNC_PANEL_ROSTER, MODERATOR_NAME, type PanelPersonaConfig } from "../panel/panel-personas";
import { extractEarlierAnswerSnippet } from "../services/interview-realism";

export interface PanelTurnResult {
  decision: ModeratorDecision;
  question: string;
  speaker: PanelPersonaConfig;
  evaluation: ReturnType<typeof evaluatePanelistTurn>;
  answerAnalysis: ReturnType<typeof evaluateResponse>;
  interrupted: boolean;
}

export async function generatePanelQuestion(opts: {
  persona: PanelPersonaConfig;
  action: ModeratorDecision["action"];
  targetRole: string;
  answer: string;
  recentTranscript: string;
  interrupted: boolean;
  earlierSnippet?: string | null;
  skills?: string[];
  userId: string;
  sessionId: string;
}): Promise<string> {
  const prompt = buildPanelQuestionPrompt({
    persona: opts.persona,
    action: opts.action,
    targetRole: opts.targetRole,
    answer: opts.answer,
    recentTranscript: opts.recentTranscript,
    interrupted: opts.interrupted,
    earlierSnippet: opts.earlierSnippet,
  });

  try {
    const agent = AgentFactory.create(opts.persona.agentId);
    const result = await agent.run(
      {
        targetRole: opts.targetRole,
        skills: opts.skills,
        answer: opts.answer,
        action: opts.action,
        prompt,
        asked: [],
      },
      { userId: opts.userId, sessionId: opts.sessionId }
    );
    const q = (result.result as { question?: string })?.question;
    if (q && q.length > 10) return normalizePanelQuestion(q);
  } catch {
    // fallback below
  }

  const fallbacks: Record<string, string[]> = {
    hr: [
      "What motivates you to join our organization, and how do your values align with our culture?",
      "Walk me through a time you had to adapt to a significant change at work.",
    ],
    technical_lead: [
      "Can you walk me through the architecture of your most complex project and the trade-offs you made?",
      "How would you debug a production incident affecting 10% of users?",
    ],
    engineering_manager: [
      "Tell me about a time you had to deliver under a tight deadline with competing priorities.",
      "How do you handle disagreement within your team on technical direction?",
    ],
    director: [
      "If you had to present this initiative to the executive team in two minutes, what would you say?",
      "How do you balance technical debt against business delivery at scale?",
    ],
    recruiter: [
      "In one minute, why should we hire you for this role over other candidates?",
      "How do you communicate complex technical work to non-technical stakeholders?",
    ],
  };

  const pool = fallbacks[opts.persona.persona] || fallbacks.technical_lead;
  const prefix =
    opts.action === "interrupt"
      ? "Let me stop you there — "
      : opts.action === "challenge"
        ? "I'd like to push back on that — "
        : opts.action === "cross_question" && opts.earlierSnippet
          ? `Earlier you mentioned ${opts.earlierSnippet.replace(/\.$/, "")} — can you walk me through your specific contribution?`
          : "";

  return normalizePanelQuestion(prefix + pool[Math.floor(Math.random() * pool.length)]);
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
    skills: opts.skills,
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

export function getOpeningPanelMessage(targetRole: string): { moderator: string; firstQuestion: string; speaker: PanelPersonaConfig } {
  const hr = MNC_PANEL_ROSTER.find((p) => p.persona === "hr")!;
  return {
    moderator: `Welcome to your panel interview. ${hr.name} will ask the first question.`,
    firstQuestion: normalizePanelQuestion(
      `Please introduce yourself and tell us why you are interested in the ${targetRole} role.`
    ),
    speaker: hr,
  };
}

export { MNC_PANEL_ROSTER, MODERATOR_NAME };
