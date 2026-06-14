import type { StudentIntelligenceProfile } from "@prisma/client";

export interface StudentCoachContext {
  profile: StudentIntelligenceProfile;
  targetRole: string;
  resumeScore: number;
  latestInterviewScore: number;
  confidenceScore: number;
  latestCodingScore: number;
  interviewReports: Array<{
    sessionId: string;
    type: string;
    interviewScore: number;
    placementReadiness: number;
    strengths: string[];
    improvements: string[];
  }>;
  codingEvaluations: Array<{
    sessionId: string;
    overallScore: number;
    verdict: string | null;
    timeComplexity: string | null;
  }>;
  resumeAnalysis: { atsScore: number; feedback: string[] } | null;
  githubSummary: string;
  linkedinSummary: string;
  leetcodeSummary: string;
  hackerrankSummary: string;
  professionalScores: {
    githubScore: number;
    linkedinScore: number;
    leetcodeScore: number;
    hackerrankScore: number;
    professionalReadiness: number;
    portfolioStrength: number;
  };
}
