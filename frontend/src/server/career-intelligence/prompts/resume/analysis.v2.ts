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
  "atsTips": ["string — concrete ATS improvements"],
  "aiQualityScore": 0
}

Target role: {{targetRole}}
ATS score (computed from resume content): {{atsScore}}
Keyword match: {{keywordMatchPct}}%
Resume data: {{resumeData}}

Also provide aiQualityScore (0-100) for overall resume quality: writing clarity, impact metrics, project depth, and role fit.`,
};
