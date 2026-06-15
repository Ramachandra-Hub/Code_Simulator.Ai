import type { CodeDifficulty, CodeLanguage, CodeProblemCategory } from "@prisma/client";
import { prisma } from "../core/db/prisma";
import { llmPromptJson } from "../career-intelligence/prompts/agent-llm";
import { CodingProblemSchema } from "../career-intelligence/prompts/schemas";

export interface ProblemGenerationInput {
  userId: string;
  targetCompany?: string;
  targetRole?: string;
  weakAreas?: string[];
  difficulty?: CodeDifficulty;
  category?: CodeProblemCategory;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function generateAndStoreProblem(input: ProblemGenerationInput) {
  const [twin, readiness] = await Promise.all([
    prisma.studentIntelligenceProfile.findUnique({ where: { userId: input.userId } }),
    prisma.placementReadiness.findFirst({ where: { userId: input.userId }, orderBy: { computedAt: "desc" } }),
  ]);

  const weakAreas =
    input.weakAreas?.length
      ? input.weakAreas
      : twin?.weaknesses?.length
        ? twin.weaknesses
        : ["arrays", "strings"];

  let companyId: string | undefined;
  if (input.targetCompany) {
    const company = await prisma.companyProfile.upsert({
      where: { name: input.targetCompany },
      create: { name: input.targetCompany },
      update: {},
    });
    companyId = company.id;
  }

  const topicSlug = (input.category || "arrays").replace(/_/g, "-");
  const topic = await prisma.codeTopic.findFirst({ where: { slug: topicSlug } });

  const { data, valid } = await llmPromptJson(
    "coding",
    "problem-generation",
    {
      targetRole: input.targetRole || "Software Engineer",
      targetCompany: input.targetCompany || "General",
      difficulty: input.difficulty || "medium",
      weakAreas: JSON.stringify(weakAreas),
      placementReadiness: String(readiness?.overallScore ?? twin?.placementScore ?? 50),
      skills: JSON.stringify(twin?.strengths || []),
    },
    CodingProblemSchema,
    {
      title: "Array Pair Sum",
      description: "Given an array of integers and a target, return indices of two numbers that add up to target.",
      difficulty: "medium",
      topics: ["arrays"],
      constraints: "2 <= nums.length <= 10^4",
      examples: [{ input: "[2,7,11,15], 9", output: "[0,1]" }],
      starterCode: "def solution(nums, target):\n    pass",
    }
  );

  if (!valid || !data.title) throw new Error("Problem generation failed");

  const slug = `${slugify(data.title)}-${Date.now().toString(36)}`;

  const problem = await prisma.codeProblem.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      difficulty: (data.difficulty as CodeDifficulty) || input.difficulty || "medium",
      category: input.category || "arrays",
      topicId: topic?.id,
      constraints: data.constraints,
      examples: data.examples || [],
      starterCode: {
        python: data.starterCode || "def solution():\n    pass\n",
        javascript: "function solution() {}\n",
        java: "class Solution { public static void main(String[] a) {} }\n",
        cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main() { return 0; }\n",
        c: "#include <stdio.h>\nint main() { return 0; }\n",
        typescript: "function solution(): void {}\n",
      },
      expectedTime: "O(n)",
      expectedSpace: "O(1)",
      generatedByAgent: true,
      companyId,
      languages: ["python", "java", "cpp", "javascript", "typescript", "c"] as CodeLanguage[],
      testCases: {
        create: [
          {
            input: data.examples?.[0]?.input?.toString() || "1 2",
            expectedOutput: data.examples?.[0]?.output?.toString() || "3",
            isHidden: false,
            order: 0,
          },
        ],
      },
      tags: { create: (data.topics || ["generated"]).map((tag) => ({ tag })) },
    },
    include: { testCases: true, hints: true },
  });

  if (companyId) {
    await prisma.codeProblemCompany.create({ data: { problemId: problem.id, companyId } });
  }

  return problem;
}
