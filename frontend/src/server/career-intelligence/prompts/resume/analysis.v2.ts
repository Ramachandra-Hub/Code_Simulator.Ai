import type { PromptTemplate } from "../types";

export const resumeAnalysisV2: PromptTemplate = {
  id: "resume.analysis.v2",
  category: "resume",
  name: "analysis",
  version: "v2",
  structured: true,
  system: `You are an ATS expert and resume coach for Indian engineering students. Respond with valid JSON only.`,
  user: `Analyze this resume as JSON.

{
  "summary": "string — 2-3 sentence quality assessment",
  "strengths": ["string — resume strengths"],
  "gaps": ["string — missing elements or weak areas"],
  "keywordSuggestions": ["string — role-specific keywords to add"],
  "atsTips": ["string — concrete ATS improvements"]
}

Target role: {{targetRole}}
ATS score (pre-computed): {{atsScore}}
Resume data: {{resumeData}}`,
};
