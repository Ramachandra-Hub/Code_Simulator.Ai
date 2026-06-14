import type { PanelPersonaConfig } from "../panel/panel-personas";

export type ModeratorAction = "question" | "follow_up" | "interrupt" | "challenge" | "cross_question";

export interface ModeratorDecision {
  nextSpeakerId: string;
  nextSpeakerPersona: string;
  action: ModeratorAction;
  reason: string;
  interrupted: boolean;
}

export interface ModeratorInput {
  panel: Array<{
    id: string;
    persona: string;
    name: string;
    role: string;
    lastSpokeAt?: string | null;
    lastScore?: number;
  }>;
  answer: string;
  answerScore?: number;
  turnCount: number;
  maxTurns: number;
  recentTranscript: Array<{ speaker: string; text: string; role: string }>;
  targetRole?: string;
}

const PERSONA_PRIORITY: Record<string, number> = {
  hr: 1,
  recruiter: 2,
  technical_lead: 3,
  engineering_manager: 4,
  director: 5,
};

function pickLongestSilent(panel: ModeratorInput["panel"]) {
  return [...panel].sort((a, b) => {
    const aTime = a.lastSpokeAt ? new Date(a.lastSpokeAt).getTime() : 0;
    const bTime = b.lastSpokeAt ? new Date(b.lastSpokeAt).getTime() : 0;
    return aTime - bTime;
  })[0];
}

function pickByExpertise(panel: ModeratorInput["panel"], answer: string): (typeof panel)[0] | null {
  const lower = answer.toLowerCase();
  const techKeywords = /architecture|system|api|database|scale|design|code|bug|deploy/i;
  const leadershipKeywords = /team|lead|manage|conflict|deadline|stakeholder|priority/i;
  const cultureKeywords = /culture|motivat|goal|value|why|company/i;

  if (techKeywords.test(lower)) {
    return panel.find((p) => p.persona === "technical_lead") || null;
  }
  if (leadershipKeywords.test(lower)) {
    return panel.find((p) => p.persona === "engineering_manager" || p.persona === "director") || null;
  }
  if (cultureKeywords.test(lower)) {
    return panel.find((p) => p.persona === "hr" || p.persona === "recruiter") || null;
  }
  return null;
}

/** PanelModeratorAgent — turn order, interruptions, speaker selection, flow */
export function runPanelModerator(input: ModeratorInput): ModeratorDecision {
  const { panel, answer, answerScore = 60, turnCount, maxTurns, recentTranscript } = input;
  if (!panel.length) throw new Error("Empty panel");

  const weakAnswer = answerScore < 55 || answer.trim().split(/\s+/).length < 15;
  const strongAnswer = answerScore >= 80;
  const lastAiSpeaker = [...recentTranscript].reverse().find((t) => t.role === "ai")?.speaker;

  let action: ModeratorAction = "question";
  let interrupted = false;
  let reason = "Standard turn rotation";

  if (weakAnswer && Math.random() < 0.45 && turnCount > 1) {
    action = "interrupt";
    interrupted = true;
    reason = "Moderator redirects — answer lacked depth or clarity";
  } else if (strongAnswer && Math.random() < 0.35) {
    action = "challenge";
    reason = "Panel challenges a strong claim for deeper validation";
  } else if (turnCount > 2 && Math.random() < 0.3) {
    action = "cross_question";
    reason = "Cross-question referencing earlier response";
  } else if (turnCount > 0 && Math.random() < 0.25) {
    action = "follow_up";
    reason = "Follow-up on the same topic";
  }

  let next = pickByExpertise(panel, answer) || pickLongestSilent(panel);

  if (action === "follow_up" && lastAiSpeaker) {
    const same = panel.find((p) => p.name === lastAiSpeaker);
    if (same) next = same;
  }

  if (action === "cross_question") {
    const others = panel.filter((p) => p.name !== lastAiSpeaker);
    next = others[turnCount % others.length] || next;
  }

  if (turnCount === 0) {
    next = panel.find((p) => p.persona === "hr") || panel[0];
    action = "question";
    reason = "Opening — HR sets context";
  } else if (turnCount === maxTurns - 1) {
    next = panel.find((p) => p.persona === "director") || pickLongestSilent(panel);
    action = "question";
    reason = "Closing — Director final executive assessment";
  }

  const prioritySorted = [...panel].sort(
    (a, b) => (PERSONA_PRIORITY[a.persona] || 9) - (PERSONA_PRIORITY[b.persona] || 9)
  );
  if (turnCount > 0 && turnCount % panel.length === 0 && action === "question") {
    next = prioritySorted[turnCount % panel.length] || next;
  }

  return {
    nextSpeakerId: next.id,
    nextSpeakerPersona: next.persona,
    action,
    reason,
    interrupted,
  };
}

export function buildPanelQuestionPrompt(opts: {
  persona: PanelPersonaConfig;
  action: ModeratorAction;
  targetRole: string;
  answer: string;
  recentTranscript: string;
  interrupted: boolean;
}): string {
  const actionGuide: Record<ModeratorAction, string> = {
    question: "Ask a new interview question appropriate to your role.",
    follow_up: "Ask a sharp follow-up on the candidate's last answer.",
    interrupt: "Politely interrupt and redirect — the answer was vague. Ask for specifics.",
    challenge: "Challenge the candidate's claim. Ask for metrics, trade-offs, or evidence.",
    cross_question: "Reference something said earlier in the transcript and cross-examine consistency.",
  };

  return [
    `You are ${opts.persona.name}, ${opts.persona.role} on an MNC panel interview.`,
    `Personality: ${opts.persona.personality}`,
    `Expertise: ${opts.persona.expertise.join(", ")}`,
    `Style: ${opts.persona.questioningStyle}`,
    `Target role: ${opts.targetRole}`,
    `Action: ${actionGuide[opts.action]}`,
    opts.interrupted ? "Note: You are interrupting the candidate." : "",
    `Recent transcript:\n${opts.recentTranscript}`,
    `Candidate's last answer: ${opts.answer}`,
    "Respond with exactly ONE interview question only.",
    "Rules: one question mark maximum, no bullet points, no markdown, no hashtags, no asterisks, no numbered lists, no multiple questions.",
    "Wait for the candidate to answer before another panelist speaks.",
    "Plain spoken English only, 1 to 2 short sentences.",
  ]
    .filter(Boolean)
    .join("\n");
}
