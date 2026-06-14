import type { PromptTemplate } from "../types";

export const codingProblemGenerationV2: PromptTemplate = {
  id: "coding.problem-generation.v2",
  category: "coding",
  name: "problem-generation",
  version: "v2",
  structured: true,
  description: "Generate structured coding interview problem as JSON",
  system: `You are a senior technical interviewer creating coding problems.
Return ONLY valid JSON — no markdown fences, no explanation outside JSON.`,
  user: `Generate a {{difficulty}} coding problem for a {{targetRole}} interview.

Skills context: {{skills}}
Avoid repeating these problems: {{asked}}

Return JSON:
{
  "title": "short problem title",
  "description": "full problem statement with constraints",
  "difficulty": "easy|medium|hard",
  "topics": ["arrays", "hash-map"],
  "constraints": "input size limits",
  "examples": [{"input": "...", "output": "..."}],
  "starterCode": "minimal starter function skeleton",
  "rationale": "why this tests the candidate"
}`,
};
