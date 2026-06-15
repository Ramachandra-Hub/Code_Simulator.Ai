/** Human interviewer personas — single source for voice & mock interviews. */

export type InterviewerPersonality = "friendly" | "technical" | "strict" | "strategic" | "neutral";

export interface InterviewerPersona {
  id: string;
  name: string;
  role: string;
  personality: InterviewerPersonality;
  personalityLabel: string;
  avatarInitials?: string;
}

export const VOICE_INTERVIEWER_PERSONAS: Record<string, InterviewerPersona> = {
  hr: {
    id: "hr",
    name: "Sarah Johnson",
    role: "HR Manager",
    personality: "friendly",
    personalityLabel: "Friendly",
    avatarInitials: "SJ",
  },
  technical: {
    id: "technical",
    name: "David Kumar",
    role: "Senior Software Engineer",
    personality: "technical",
    personalityLabel: "Technical",
    avatarInitials: "DK",
  },
  behavioral: {
    id: "behavioral",
    name: "Michael Torres",
    role: "Engineering Manager",
    personality: "strict",
    personalityLabel: "Strict",
    avatarInitials: "MT",
  },
  system_design: {
    id: "system_design",
    name: "Elena Vasquez",
    role: "Director of Engineering",
    personality: "strategic",
    personalityLabel: "Strategic",
    avatarInitials: "EV",
  },
};

export function getInterviewerPersona(interviewType: string): InterviewerPersona {
  return VOICE_INTERVIEWER_PERSONAS[interviewType] || VOICE_INTERVIEWER_PERSONAS.technical;
}

/** Panel persona → personality type for meeting room tiles */
export const PANEL_PERSONALITY_BY_PERSONA: Record<
  string,
  { personality: InterviewerPersonality; personalityLabel: string }
> = {
  hr: { personality: "friendly", personalityLabel: "Friendly" },
  technical_lead: { personality: "technical", personalityLabel: "Technical" },
  engineering_manager: { personality: "strict", personalityLabel: "Strict" },
  director: { personality: "strategic", personalityLabel: "Strategic" },
  recruiter: { personality: "neutral", personalityLabel: "Evaluative" },
};

export const THINKING_STATUS_MESSAGES = [
  "Reviewing your answer...",
  "Taking notes on your response...",
  "Considering a follow-up...",
  "Evaluating your experience...",
] as const;

export function pickThinkingMessage(): string {
  return THINKING_STATUS_MESSAGES[Math.floor(Math.random() * THINKING_STATUS_MESSAGES.length)];
}
