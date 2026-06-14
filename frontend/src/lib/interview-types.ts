export type InterviewType =
  | "hr"
  | "technical"
  | "behavioral"
  | "coding"
  | "system_design";

export type VoiceInterviewType = "hr" | "technical" | "behavioral" | "system_design";

export const VOICE_INTERVIEW_TYPES: Array<InterviewTypeInfo & { id: VoiceInterviewType }> = [
  { id: "hr", label: "HR Voice", description: "Culture fit and motivation — spoken answers", duration: "20-30 min", questionCount: 5 },
  { id: "technical", label: "Technical Voice", description: "Skills and projects from your resume — voice only", duration: "30-40 min", questionCount: 6 },
  { id: "behavioral", label: "Behavioral Voice", description: "STAR-format situational questions — spoken", duration: "25-35 min", questionCount: 5 },
  { id: "system_design", label: "System Design Voice", description: "Architecture and trade-offs — voice discussion", duration: "40-45 min", questionCount: 4 },
];

export const VOICE_PROFILES = [
  { id: "professional", label: "Professional", description: "Clear neutral professional tone" },
  { id: "female", label: "Female Voice", description: "Warm female interviewer voice" },
  { id: "male", label: "Male Voice", description: "Calm male interviewer voice" },
] as const;

export interface InterviewTypeInfo {
  id: InterviewType;
  label: string;
  description: string;
  duration: string;
  questionCount: number;
}

export const INTERVIEW_TYPES: InterviewTypeInfo[] = [
  { id: "hr", label: "HR Interview", description: "Culture fit, motivation, career goals", duration: "20-30 min", questionCount: 5 },
  { id: "technical", label: "Technical Interview", description: "Skills, projects, and domain knowledge from your resume", duration: "30-45 min", questionCount: 6 },
  { id: "behavioral", label: "Behavioral Interview", description: "STAR-based situational and leadership questions", duration: "25-35 min", questionCount: 5 },
  { id: "coding", label: "Coding Interview", description: "Problem-solving and algorithmic thinking", duration: "45-60 min", questionCount: 4 },
  { id: "system_design", label: "System Design", description: "Architecture, scalability, and trade-offs", duration: "45-60 min", questionCount: 4 },
];

export const PANEL_INTERVIEW_TYPE = {
  id: "panel" as const,
  label: "Panel Interview",
  description: "MNC-style panel with HR, Technical Lead, EM, Director, and Recruiter — voice enabled",
  duration: "45-60 min",
  questionCount: 8,
};

/** Reserved for future interview modes */
export const COMING_SOON_INTERVIEW_TYPES = [] as const;

export interface InterviewAnswer {
  question: string;
  answer: string;
  scores: {
    relevance: number;
    depth: number;
    communication: number;
    confidence: number;
    overall: number;
  };
  feedback: string;
  keywordsMatched: string[];
}

export interface InterviewScores {
  communication: number;
  confidence: number;
  technicalKnowledge: number;
  relevance: number;
  fluency: number;
  overall: number;
}

export interface PlacementReport {
  placementReadiness: number;
  resumeScore: number;
  interviewScore: number;
  combinedScore: number;
  strengths: string[];
  improvements: string[];
  roleFit: string;
  recommendation: string;
  hiringProbability: string;
}

export interface InterviewSession {
  id: string;
  resumeId: string;
  resumeName: string;
  targetRole: string;
  type: InterviewType;
  answers: InterviewAnswer[];
  scores: InterviewScores;
  report: PlacementReport;
  transcript: Array<{ role: "ai" | "student"; text: string; timestamp: string }>;
  completedAt: string;
  status?: string;
}
