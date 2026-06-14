import { llmComplete } from "../career-intelligence/prompts/agent-llm";
import type { BetaInsightsPayload } from "./beta-insights-service";
import { buildRuleBasedSummary } from "./beta-insights-service";

const SYSTEM = `You are a product analytics assistant for NexusEdge, an AI career platform for students.
Given structured beta usage data, write 4-7 concise bullet insights for admins.
Each bullet must be one sentence, factual, and include percentages or counts when available.
Focus on: drop-off points, complaints, ratings, completion trends, and placement readiness.
Do not invent data. Use only the numbers provided.
Format: return a JSON array of strings, nothing else.`;

export async function generateInsightsSummary(insights: BetaInsightsPayload): Promise<{
  bullets: string[];
  aiGenerated: boolean;
}> {
  const fallback = buildRuleBasedSummary(insights);

  const payload = {
    dropOff: insights.dropOffPoints,
    topComplaints: insights.complaints.slice(0, 5),
    lowestRated: insights.lowestRatedFeatures,
    highestRated: insights.highestRatedFeatures,
    completion: insights.completionMetrics,
    interviewTrend: insights.interviewCompletionTrend.slice(-7),
    codingTrend: insights.codingCompletionTrend.slice(-7),
    placementTrend: insights.placementReadinessTrend.slice(-7),
    feedbackCount: insights.feedbackSampleCount,
  };

  try {
    const raw = await Promise.race([
      llmComplete(
        SYSTEM,
        `Analyze this beta data and return JSON array of insight strings:\n${JSON.stringify(payload, null, 2)}`,
        { temperature: 0.3, maxTokens: 600 }
      ),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("AI summary timeout")), 20_000)
      ),
    ]);

    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as unknown;
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string") && parsed.length > 0) {
        return { bullets: parsed.slice(0, 7), aiGenerated: true };
      }
    }
  } catch {
    // fall through to rule-based
  }

  return { bullets: fallback, aiGenerated: false };
}
