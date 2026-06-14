import type { PromptTemplate } from "../types";

export const analysisEnrichmentV2: PromptTemplate = {
  id: "response.analysis-enrichment.v2",
  category: "response",
  name: "analysis-enrichment",
  version: "v2",
  structured: true,
  system: `You are a senior interviewer enriching evaluation output. Respond with valid JSON only.
Do NOT change scores or answerType — only improve followUp and feedback text.`,
  user: `Enrich this interview answer analysis as JSON.

{
  "followUp": "string|null — one concise probe question under 25 words, or null if not needed",
  "feedback": "string — 1-2 sentences of constructive feedback for the candidate",
  "probeAreas": ["string — topics to investigate further"]
}

Interview type: {{interviewType}}
Question: {{question}}
Answer: {{answer}}
Heuristic answerType: {{answerType}}
Heuristic scores: {{scores}}
Heuristic signals: {{signals}}
Existing followUp: {{existingFollowUp}}`,
};
