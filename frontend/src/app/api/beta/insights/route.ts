import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { isBetaAdmin } from "@/server/beta/beta-dashboard-service";
import {
  buildRuleBasedSummary,
  computeBetaInsights,
  getOrCreateWeeklySummary,
  listWeeklySummaries,
  weekStart,
} from "@/server/beta/beta-insights-service";
import { withPerformance } from "@/server/beta/performance-service";
import { logApiError } from "@/server/beta/system-error-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isBetaAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "7", 10)));
  const refresh = url.searchParams.get("refresh") === "true";

  try {
    const insights = await withPerformance("database", "/api/beta/insights", () =>
      computeBetaInsights(days)
    );

    let weeklySummary: {
      weekStart: Date;
      weekEnd: Date;
      bullets: unknown;
      aiGenerated: boolean;
      generatedAt: Date;
    };
    try {
      const weekly = await getOrCreateWeeklySummary(refresh, insights);
      weeklySummary = {
        weekStart: weekly.weekStart,
        weekEnd: weekly.weekEnd,
        bullets: weekly.aiSummary,
        aiGenerated: weekly.aiGenerated,
        generatedAt: weekly.generatedAt,
      };
    } catch (summaryErr) {
      console.warn("[beta/insights] weekly summary fallback:", summaryErr);
      const start = weekStart();
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      weeklySummary = {
        weekStart: start,
        weekEnd: end,
        bullets: buildRuleBasedSummary(insights),
        aiGenerated: false,
        generatedAt: new Date(),
      };
    }

    let history: Awaited<ReturnType<typeof listWeeklySummaries>> = [];
    try {
      history = await listWeeklySummaries(8);
    } catch {
      history = [];
    }

    return NextResponse.json({
      insights,
      weeklySummary: {
        weekStart: weeklySummary.weekStart,
        weekEnd: weeklySummary.weekEnd,
        bullets: weeklySummary.bullets,
        aiGenerated: weeklySummary.aiGenerated,
        generatedAt: weeklySummary.generatedAt,
      },
      weeklyHistory: history.map((w) => ({
        id: w.id,
        weekStart: w.weekStart,
        weekEnd: w.weekEnd,
        bullets: w.aiSummary,
        aiGenerated: w.aiGenerated,
        generatedAt: w.generatedAt,
      })),
    });
  } catch (err) {
    logApiError("/api/beta/insights", err, { method: "GET", userId: user.id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Insights failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isBetaAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const weekly = await withPerformance("ollama", "/api/beta/insights/refresh", () =>
      getOrCreateWeeklySummary(true)
    );
    return NextResponse.json({
      weekStart: weekly.weekStart,
      weekEnd: weekly.weekEnd,
      bullets: weekly.aiSummary,
      aiGenerated: weekly.aiGenerated,
      generatedAt: weekly.generatedAt,
    });
  } catch (err) {
    logApiError("/api/beta/insights", err, { method: "POST", userId: user.id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
