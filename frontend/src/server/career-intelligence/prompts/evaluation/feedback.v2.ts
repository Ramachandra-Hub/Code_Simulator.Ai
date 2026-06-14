import type { PromptTemplate } from "../types";

export const feedbackV2: PromptTemplate = {
  id: "evaluation.feedback.v2",
  category: "evaluation",
  name: "feedback",
  version: "v2",
  structured: true,
  system: `You are a career coach giving post-interview feedback. Respond with valid JSON only. Be specific and actionable.`,
  user: `Generate interview feedback as JSON.

{
  "feedback": "string — main feedback paragraph",
  "actionableSteps": ["string — 3-5 specific next steps"],
  "priority": "high|medium|low",
  "focusAreas": ["string — skills or behaviors to improve"]
}

Scores: {{scores}}
Weaknesses: {{weaknesses}}
Target role: {{targetRole}}`,
};
