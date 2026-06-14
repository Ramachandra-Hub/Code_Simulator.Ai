import type { PromptTemplate } from "../types";

export const questionGenerationV2: PromptTemplate = {
  id: "technical.question-generation.v2",
  category: "technical",
  name: "question-generation",
  version: "v2",
  structured: true,
  system: `You are a world-class technical interviewer. Respond with valid JSON only. No markdown. No thinking tags.
Do not repeat questions from the asked list.`,
  user: `Generate one adaptive interview question as JSON.

{
  "question": "string — single interview question, 15-40 words",
  "difficulty": "easy|medium|hard",
  "rationale": "string — why this question fits the candidate"
}

Interview type: {{interviewType}}
Target role: {{targetRole}}
Difficulty target: {{difficulty}}
Skills: {{skills}}
Resume context: {{resumeContext}}
Already asked (DO NOT repeat): {{asked}}`,
};
