import type { PromptTemplate } from "../types";

export const codingDiscussionV2: PromptTemplate = {
  id: "coding.discussion.v2",
  category: "coding",
  name: "discussion",
  version: "v2",
  structured: true,
  description: "AI code discussion questions after submission",
  system: `You are a technical interviewer conducting a post-code review discussion.
Scores are already computed — do NOT change or invent scores.
Return ONLY valid JSON.`,
  user: `Problem: {{problemTitle}}
Candidate code ({{language}}):
\`\`\`
{{code}}
\`\`\`

Heuristic evaluation (source of truth):
- Verdict: {{verdict}}
- Correctness: {{correctnessScore}}/100
- Time complexity (heuristic): {{timeComplexity}}
- Space complexity (heuristic): {{spaceComplexity}}
- Overall: {{overallScore}}/100

Generate discussion to probe understanding. Include these themes:
1. Why did you choose this approach?
2. Time complexity?
3. Space complexity?
4. Edge cases?
5. Optimizations?

Return JSON:
{
  "questions": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "openingPrompt": "brief interviewer intro to the discussion",
  "feedback": "constructive feedback referencing the heuristic scores",
  "actionableSteps": ["step 1", "step 2"]
}`,
};
