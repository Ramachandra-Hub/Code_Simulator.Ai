import { prisma } from "../core/db/prisma";
import { llmComplete } from "../career-intelligence/prompts/agent-llm";
import { getAiQualityDashboard } from "./ai-quality-dashboard-service";

function weekStart(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function buildHeuristicReport(metrics: Awaited<ReturnType<typeof getAiQualityDashboard>>): string[] {
  const bullets: string[] = [];

  if (metrics.bestQuestions[0]) {
    bullets.push(
      `Best interview question: "${metrics.bestQuestions[0].question.slice(0, 60)}..." (${metrics.bestQuestions[0].score}/100 effectiveness).`
    );
  }
  if (metrics.worstQuestions[0]) {
    bullets.push(
      `Worst interview question: "${metrics.worstQuestions[0].question.slice(0, 60)}..." (${metrics.worstQuestions[0].score}/100) — consider revising or retiring.`
    );
  }
  if (metrics.bestRecommendations[0]) {
    bullets.push(
      `Most useful recommendation: "${metrics.bestRecommendations[0].title}" (${metrics.bestRecommendations[0].adoptionRate}% adoption).`
    );
  }
  if (metrics.worstRecommendations[0]) {
    bullets.push(
      `Least useful recommendation: "${metrics.worstRecommendations[0].title}" — ${metrics.worstRecommendations[0].ignored} ignores.`
    );
  }

  bullets.push(
    `Interview question completion rate: ${metrics.interviewQuality.questionCompletionRate}% (abandon rate ${metrics.interviewQuality.questionSkipRate}%).`
  );
  bullets.push(
    `Career coach acceptance: ${metrics.coachQuality.acceptanceRate}% · roadmap completion: ${metrics.coachQuality.roadmapCompletionRate}%.`
  );

  if (metrics.studentImprovement.improving > metrics.studentImprovement.declining) {
    bullets.push(
      `Student improvement trending positive: ${metrics.studentImprovement.improving} students up vs ${metrics.studentImprovement.declining} down.`
    );
  } else if (metrics.studentImprovement.declining > 0) {
    bullets.push(
      `Warning: ${metrics.studentImprovement.declining} students show declining placement readiness.`
    );
  }

  const platformChanges: string[] = [];
  if (metrics.interviewQuality.questionSkipRate > 30) {
    platformChanges.push("Reduce interview length or add clearer progress indicators");
  }
  if (metrics.coachQuality.acceptanceRate < 40) {
    platformChanges.push("Personalize career coach recommendations using twin signals");
  }
  if (metrics.coachQuality.avgCoachRating > 0 && metrics.coachQuality.avgCoachRating < 3.5) {
    platformChanges.push("Review career coach prompt quality and response time");
  }
  if (platformChanges.length) {
    bullets.push(`Recommended platform changes: ${platformChanges.join("; ")}.`);
  }

  return bullets.slice(0, 8);
}

async function generateAiBullets(metrics: object, heuristic: string[]): Promise<{ bullets: string[]; aiGenerated: boolean }> {
  try {
    const raw = await Promise.race([
      llmComplete(
        `You are a platform improvement analyst for NexusEdge. Given heuristic metrics, write 5-8 bullet points covering: what improved, what got worse, and recommended platform changes. Return JSON array of strings only. Heuristics are source of truth — do not invent numbers.`,
        `Heuristic bullets:\n${JSON.stringify(heuristic)}\n\nFull metrics:\n${JSON.stringify(metrics, null, 2)}`,
        { temperature: 0.3, maxTokens: 700 }
      ),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 20_000)),
    ]);
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as unknown;
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
        return { bullets: parsed.slice(0, 8), aiGenerated: true };
      }
    }
  } catch {
    // fallback
  }
  return { bullets: heuristic, aiGenerated: false };
}

export async function getOrCreateImprovementReport(forceRefresh = false) {
  const start = weekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const existing = await prisma.intelligenceImprovementReport.findUnique({
    where: { weekStart: start },
  });

  const stale =
    existing && Date.now() - existing.generatedAt.getTime() > 24 * 60 * 60 * 1000;

  if (existing && !forceRefresh && !stale) return existing;

  const metrics = await getAiQualityDashboard(7);
  const heuristic = buildHeuristicReport(metrics);
  const { bullets, aiGenerated } = await generateAiBullets(metrics, heuristic);

  try {
    return await prisma.intelligenceImprovementReport.upsert({
      where: { weekStart: start },
      create: {
        weekStart: start,
        weekEnd: end,
        metrics: metrics as object,
        aiSummary: bullets,
        aiGenerated,
      },
      update: {
        metrics: metrics as object,
        aiSummary: bullets,
        aiGenerated,
        generatedAt: new Date(),
      },
    });
  } catch {
    return {
      id: "ephemeral",
      weekStart: start,
      weekEnd: end,
      metrics: metrics as object,
      aiSummary: bullets,
      aiGenerated,
      generatedAt: new Date(),
    };
  }
}

export async function listImprovementReports(limit = 6) {
  return prisma.intelligenceImprovementReport.findMany({
    orderBy: { weekStart: "desc" },
    take: limit,
  });
}

export { buildHeuristicReport, weekStart };
