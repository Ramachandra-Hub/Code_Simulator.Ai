import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getBetaDashboardStats, isBetaAdmin } from "@/server/beta/beta-dashboard-service";
import { getPerformanceSummary } from "@/server/beta/performance-service";
import { logApiError } from "@/server/beta/system-error-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isBetaAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const hours = parseInt(url.searchParams.get("hours") || "24", 10);
  try {
    const [stats, performance] = await Promise.all([
      getBetaDashboardStats(),
      getPerformanceSummary(hours),
    ]);
    return NextResponse.json({ stats, performance });
  } catch (err) {
    logApiError("/api/beta/dashboard", err, { method: "GET", userId: user.id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dashboard failed" },
      { status: 500 }
    );
  }
}
