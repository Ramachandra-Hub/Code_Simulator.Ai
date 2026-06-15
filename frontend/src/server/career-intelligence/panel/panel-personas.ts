/** MNC-style panel composition — human names & distinct personalities */

import type { InterviewerPersonality } from "@/lib/interview-personas";

export interface PanelPersonaConfig {
  persona: string;
  name: string;
  role: string;
  voiceId: string;
  personality: string;
  personalityType: InterviewerPersonality;
  expertise: string[];
  questioningStyle: string;
  agentId: string;
}

export const MNC_PANEL_ROSTER: PanelPersonaConfig[] = [
  {
    persona: "hr",
    name: "Sarah Johnson",
    role: "HR Manager",
    voiceId: "panel_hr_female",
    personality: "Warm, welcoming, culture-focused",
    personalityType: "friendly",
    expertise: ["culture fit", "motivation", "career goals", "values alignment"],
    questioningStyle: "Open-ended behavioral with culture probes",
    agentId: "hr-interview",
  },
  {
    persona: "technical_lead",
    name: "David Kumar",
    role: "Senior Software Engineer",
    voiceId: "panel_tech_lead",
    personality: "Analytical, precise, depth-oriented",
    personalityType: "technical",
    expertise: ["system design", "code quality", "architecture", "debugging"],
    questioningStyle: "Deep technical follow-ups and trade-off challenges",
    agentId: "technical-interview",
  },
  {
    persona: "engineering_manager",
    name: "Michael Torres",
    role: "Engineering Manager",
    voiceId: "panel_em_male",
    personality: "Direct, accountability-focused, high standards",
    personalityType: "strict",
    expertise: ["team leadership", "delivery", "conflict resolution", "prioritization"],
    questioningStyle: "STAR behavioral with ownership probes; cross-examines technical claims",
    agentId: "behavioral-interview",
  },
  {
    persona: "director",
    name: "Elena Vasquez",
    role: "Director of Engineering",
    voiceId: "panel_director_female",
    personality: "Strategic, executive-minded, big-picture",
    personalityType: "strategic",
    expertise: ["stakeholder management", "strategy", "scaling", "executive communication"],
    questioningStyle: "Big-picture challenges and executive summaries",
    agentId: "behavioral-interview",
  },
  {
    persona: "recruiter",
    name: "Marcus Johnson",
    role: "Senior Technical Recruiter",
    voiceId: "panel_recruiter_male",
    personality: "Direct, evaluative, communication-focused",
    personalityType: "neutral",
    expertise: ["communication", "role fit", "salary expectations", "candidate narrative"],
    questioningStyle: "Concise probes on clarity and role alignment",
    agentId: "hr-interview",
  },
];

export const MODERATOR_NAME = "Panel Moderator";
export const MODERATOR_VOICE = "professional_en";

export const PANEL_BROWSER_VOICES: Record<string, { pitch: number; rate: number }> = {
  panel_hr_female: { pitch: 1.1, rate: 0.95 },
  panel_tech_lead: { pitch: 1.0, rate: 0.9 },
  panel_em_male: { pitch: 0.85, rate: 0.92 },
  panel_director_female: { pitch: 0.95, rate: 0.88 },
  panel_recruiter_male: { pitch: 0.8, rate: 1.0 },
};
