import { prisma } from "../core/db/prisma";
import { llmPromptJson } from "../career-intelligence/prompts/agent-llm";
import { z } from "zod";

const ReviewSchema = z.object({
  readability: z.number(),
  naming: z.number(),
  complexity: z.number(),
  optimization: z.number(),
  edgeCases: z.number(),
  bestPractices: z.number(),
  summary: z.string(),
  suggestions: z.array(z.string()),
});

export async function runCodeReview(submissionId: string) {
  const submission = await prisma.codeProblemSubmission.findUnique({
    where: { id: submissionId },
    include: { problem: true, review: true },
  });
  if (!submission) throw new Error("Submission not found");
  if (submission.review) return submission.review;

  const { data, valid } = await llmPromptJson(
    "coding",
    "discussion",
    {
      problem: submission.problem.title,
      code: submission.code.slice(0, 4000),
      language: submission.language,
      verdict: submission.verdict,
    },
    ReviewSchema,
    {
      readability: 70,
      naming: 70,
      complexity: 65,
      optimization: 60,
      edgeCases: 65,
      bestPractices: 70,
      summary: "Review generated from submission analysis.",
      suggestions: ["Add edge case tests", "Improve variable names"],
    }
  );

  return prisma.codeReviewReport.create({
    data: {
      submissionId,
      readability: data.readability,
      naming: data.naming,
      complexity: data.complexity,
      optimization: data.optimization,
      edgeCases: data.edgeCases,
      bestPractices: data.bestPractices,
      summary: valid ? data.summary : "Automated review",
      suggestions: data.suggestions || [],
      source: valid ? "code-review-agent" : "heuristic",
    },
  });
}
