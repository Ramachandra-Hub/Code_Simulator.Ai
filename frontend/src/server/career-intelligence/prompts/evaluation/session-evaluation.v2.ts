import type { PromptTemplate } from "../types";

export const sessionEvaluationV2: PromptTemplate = {
  id: "evaluation.session-evaluation.v2",
  category: "evaluation",
  name: "session-evaluation",
  version: "v2",
  structured: true,
  system: `You are a placement interview evaluator. Respond with valid JSON only.
Numeric overallScore is pre-computed — do not invent a different score.`,
  user: `Summarize this interview session as JSON.

{
  "summary": "string — 2-3 sentence holistic assessment",
  "strengths": ["string — 2-4 concrete strengths"],
  "improvements": ["string — 2-4 actionable improvements"],
  "hiringReadiness": "not_ready|developing|ready|strong"
}

Pre-computed overallScore: {{overallScore}}
Dimension scores: {{dimensions}}
Answer summaries: {{answerSummaries}}`,
};
