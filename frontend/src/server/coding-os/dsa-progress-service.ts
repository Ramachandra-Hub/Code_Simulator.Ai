import { prisma } from "../core/db/prisma";
import { updateDigitalTwin } from "../career-intelligence/memory/digital-twin";

export async function refreshDsaProgress(userId: string) {
  const topics = await prisma.codeTopic.findMany({ include: { problems: { select: { id: true } } } });
  const submissions = await prisma.codeProblemSubmission.findMany({
    where: { userId },
    select: { problemId: true, verdict: true },
  });

  const solvedSet = new Set(
    submissions.filter((s) => s.verdict === "accepted").map((s) => s.problemId)
  );
  const attemptCount = new Map<string, number>();
  for (const s of submissions) {
    attemptCount.set(s.problemId, (attemptCount.get(s.problemId) || 0) + 1);
  }

  const results = [];
  for (const topic of topics) {
    const problemIds = topic.problems.map((p) => p.id);
    const attempted = problemIds.filter((id) => attemptCount.has(id)).length;
    const solved = problemIds.filter((id) => solvedSet.has(id)).length;
    const total = problemIds.length || 1;
    const completionPct = Math.round((solved / total) * 100);
    const weakArea = completionPct < 40 && attempted > 0;

    const row = await prisma.dsaTopicProgress.upsert({
      where: { userId_topicId: { userId, topicId: topic.id } },
      create: { userId, topicId: topic.id, attempted, solved, completionPct, weakArea, lastActivityAt: new Date() },
      update: { attempted, solved, completionPct, weakArea, lastActivityAt: new Date() },
    });
    results.push(row);
  }
  return results;
}

export async function getDsaRoadmap(userId: string) {
  await refreshDsaProgress(userId);
  const progress = await prisma.dsaTopicProgress.findMany({
    where: { userId },
    include: { topic: true },
    orderBy: { topic: { order: "asc" } },
  });

  const weak = progress.filter((p) => p.weakArea).map((p) => p.topic.name);
  const recommended = progress.find((p) => p.completionPct < 100 && p.completionPct >= 0)?.topic;

  return {
    topics: progress.map((p) => ({
      slug: p.topic.slug,
      name: p.topic.name,
      attempted: p.attempted,
      solved: p.solved,
      completionPct: p.completionPct,
      weakArea: p.weakArea,
    })),
    weakAreas: weak,
    recommendedNext: recommended ? { slug: recommended.slug, name: recommended.name } : null,
  };
}

export async function syncCodingTwin(userId: string) {
  const accepted = await prisma.codeProblemSubmission.count({
    where: { userId, verdict: "accepted" },
  });
  const total = await prisma.codeProblemSubmission.count({ where: { userId } });
  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  const roadmap = await getDsaRoadmap(userId);
  const codingReadiness = Math.min(
    100,
    Math.round(accepted * 4 + acceptanceRate * 0.3 + roadmap.topics.reduce((s, t) => s + t.completionPct, 0) / Math.max(roadmap.topics.length, 1) * 0.3)
  );

  void updateDigitalTwin(userId, {
    type: "coding",
    source: "coding-os",
    data: {
      codingReadiness,
      problemSolving: codingReadiness,
      algorithmSkills: codingReadiness * 0.9,
      optimizationSkills: codingReadiness * 0.85,
      problemsSolved: accepted,
      acceptanceRate,
      weakTopics: roadmap.weakAreas,
    },
  });

  return { codingReadiness, acceptanceRate, problemsSolved: accepted };
}
