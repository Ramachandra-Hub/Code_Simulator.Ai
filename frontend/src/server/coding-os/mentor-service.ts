import { prisma } from "../core/db/prisma";
import { getProblemById } from "./problem-service";
import { getDsaRoadmap } from "./dsa-progress-service";
import { AgentFactory } from "../core/agent/agent-factory";

export type MentorMode = "explain" | "plan" | "company";

export async function getCodingMentorResponse(
  userId: string,
  input: { message: string; problemId?: string; mode?: MentorMode }
) {
  const [problem, dsa, twin] = await Promise.all([
    input.problemId ? getProblemById(input.problemId, userId) : null,
    getDsaRoadmap(userId),
    prisma.studentIntelligenceProfile.findUnique({ where: { userId } }),
  ]);

  const agent = AgentFactory.create("coding-mentor");
  const result = await agent.run(
    {
      message: input.message,
      mode: input.mode || "explain",
      problem: problem
        ? { title: problem.title, description: problem.description, difficulty: problem.difficulty }
        : null,
      weakAreas: dsa.weakAreas,
      recommendedNext: dsa.recommendedNext,
      placementReadiness: twin?.placementScore,
      strengths: twin?.strengths,
    },
    { userId }
  );

  const payload = result.result as { reply?: string; feedback?: string; question?: string };
  return payload.reply || payload.feedback || payload.question || String(result.result);
}
