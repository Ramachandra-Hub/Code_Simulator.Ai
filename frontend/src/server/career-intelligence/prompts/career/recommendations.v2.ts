import type { PromptTemplate } from "../types";

export const careerRecommendationsV2: PromptTemplate = {
  id: "career.recommendations.v2",
  category: "career",
  name: "recommendations",
  version: "v2",
  structured: true,
  description: "Personalized career recommendations from heuristic student analysis",
  system: `You are an AI Career Coach for placement preparation.
Heuristic metrics are the source of truth — do NOT invent or change scores.
Generate clear, actionable explanations and recommendations only.
Return ONLY valid JSON.`,
  user: `Student profile (heuristic metrics):
{{metrics}}

Identified weaknesses (heuristic):
{{weaknesses}}

Skill gaps (heuristic, points to target 70):
{{skillGaps}}

Context:
- Target role: {{targetRole}}
- Resume ATS: {{resumeScore}}
- Latest interview score: {{interviewScore}}
- Coding evaluations: {{codingSummary}}
- GitHub: {{githubSummary}}
- LinkedIn: {{linkedinSummary}}

Return JSON:
{
  "summary": "2-3 sentence coaching overview",
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"],
  "recommendations": [
    { "title": "action title", "description": "why and how", "priority": "high|medium|low", "category": "technical|coding|communication|resume|interview" }
  ],
  "focusAreas": ["area 1"]
}`,
};
