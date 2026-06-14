export interface CodeReviewInput {
  code: string;
  language?: string;
}

export interface CodeReviewResult {
  questions: string[];
  feedback: string;
  score: number;
}

const REVIEW_QUESTIONS = [
  "Why did you choose this design over alternatives?",
  "How does this scale under 10x traffic?",
  "What are the failure scenarios and how do you handle them?",
];

export function runCodeReview(input: CodeReviewInput): CodeReviewResult {
  const code = input.code.trim();
  const lines = code.split("\n").length;
  let score = 52;

  if (lines >= 15) score += 8;
  if (/\btry\b|\bcatch\b|throw/.test(code)) score += 6;
  if (/\basync\b|await|Promise/.test(code)) score += 5;
  if (/interface |type |: string|: number/.test(code)) score += 5;
  if (code.includes("TODO") || code.includes("any")) score -= 8;
  if (lines < 5) score -= 15;

  score = Math.max(0, Math.min(100, score));

  const feedback =
    score >= 75
      ? "Solid implementation. Address scaling and edge cases in follow-up."
      : score >= 55
        ? "Reasonable start. Tighten error handling and document design trade-offs."
        : "Needs more structure — add types, error paths, and explain design intent.";

  return { questions: REVIEW_QUESTIONS, feedback, score };
}
