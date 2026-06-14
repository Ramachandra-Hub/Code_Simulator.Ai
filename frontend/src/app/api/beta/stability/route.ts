import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { isBetaAdmin } from "@/server/beta/beta-dashboard-service";
import { getStabilityReport } from "@/server/beta/stability-service";
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
    const report = await getStabilityReport(hours);
    return NextResponse.json(report);
  } catch (err) {
    logApiError("/api/beta/stability", err, { method: "GET", userId: user.id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stability report failed" },
      { status: 500 }
    );
  }
}
