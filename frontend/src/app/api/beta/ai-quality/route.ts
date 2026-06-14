import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { isBetaAdmin } from "@/server/beta/beta-dashboard-service";
import { getAiQualityDashboard } from "@/server/intelligence/ai-quality-dashboard-service";
import {
  getOrCreateImprovementReport,
  listImprovementReports,
} from "@/server/intelligence/improvement-report-service";
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
    const dashboard = await getAiQualityDashboard(days);
    let weeklyReport;
    try {
      weeklyReport = await getOrCreateImprovementReport(refresh);
    } catch {
      weeklyReport = null;
    }
    let history: Awaited<ReturnType<typeof listImprovementReports>> = [];
    try {
      history = await listImprovementReports(6);
    } catch {
      history = [];
    }

    return NextResponse.json({
      dashboard,
      weeklyReport: weeklyReport
        ? {
            weekStart: weeklyReport.weekStart,
            weekEnd: weeklyReport.weekEnd,
            bullets: weeklyReport.aiSummary,
            aiGenerated: weeklyReport.aiGenerated,
            generatedAt: weeklyReport.generatedAt,
          }
        : null,
      reportHistory: history.map((r) => ({
        id: r.id,
        weekStart: r.weekStart,
        bullets: r.aiSummary,
        aiGenerated: r.aiGenerated,
        generatedAt: r.generatedAt,
      })),
    });
  } catch (err) {
    console.error("[beta/ai-quality]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI quality dashboard failed" },
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
    const report = await getOrCreateImprovementReport(true);
    return NextResponse.json({
      weekStart: report.weekStart,
      bullets: report.aiSummary,
      aiGenerated: report.aiGenerated,
      generatedAt: report.generatedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Report refresh failed" },
      { status: 500 }
    );
  }
}
