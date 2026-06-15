import type { CodeDifficulty, CodeProblemCategory, Prisma } from "@prisma/client";
import { prisma } from "../core/db/prisma";

export async function listProblems(filters?: {
  topicSlug?: string;
  category?: CodeProblemCategory;
  difficulty?: CodeDifficulty;
  company?: string;
  search?: string;
  limit?: number;
}) {
  const where: Prisma.CodeProblemWhereInput = { isPublished: true };
  if (filters?.difficulty) where.difficulty = filters.difficulty;
  if (filters?.category) where.category = filters.category;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters?.topicSlug) {
    where.topic = { slug: filters.topicSlug };
  }
  if (filters?.company) {
    where.OR = [
      { company: { name: { equals: filters.company, mode: "insensitive" } } },
      { companies: { some: { company: { name: { equals: filters.company, mode: "insensitive" } } } } },
    ];
  }

  return prisma.codeProblem.findMany({
    where,
    orderBy: [{ difficulty: "asc" }, { createdAt: "desc" }],
    take: filters?.limit ?? 50,
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      category: true,
      topic: { select: { name: true, slug: true } },
      company: { select: { name: true } },
      tags: { select: { tag: true } },
      _count: { select: { submissions: true } },
    },
  });
}

export async function getProblemById(idOrSlug: string, userId?: string) {
  const problem = await prisma.codeProblem.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isPublished: true },
    include: {
      topic: true,
      tags: true,
      hints: { orderBy: { order: "asc" } },
      testCases: { where: { isHidden: false }, orderBy: { order: "asc" } },
      company: { select: { id: true, name: true } },
      companies: { include: { company: { select: { id: true, name: true } } } },
    },
  });
  if (!problem) return null;

  let userStatus: { solved: boolean; attempts: number } | undefined;
  if (userId) {
    const subs = await prisma.codeProblemSubmission.findMany({
      where: { userId, problemId: problem.id },
      select: { verdict: true },
    });
    userStatus = {
      solved: subs.some((s) => s.verdict === "accepted"),
      attempts: subs.length,
    };
  }

  return { ...problem, userStatus };
}

export async function listTopics() {
  return prisma.codeTopic.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { problems: true } } } });
}
