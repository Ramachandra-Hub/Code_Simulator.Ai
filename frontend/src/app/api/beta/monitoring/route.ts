import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { isBetaAdmin } from "@/server/beta/beta-dashboard-service";
import { getMonitoringSnapshot } from "@/server/beta/monitoring-service";
import { auditEnvironment } from "@/server/lib/env-security";
import { logApiError } from "@/server/beta/system-error-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isBetaAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const hours = parseInt(url.searchParams.get("hours") || "1", 10);
  try {
    const [monitoring, security] = await Promise.all([
      getMonitoringSnapshot(hours),
      Promise.resolve(auditEnvironment(process.env.NODE_ENV === "production")),
    ]);
    return NextResponse.json({
      monitoring,
      security: {
        passed: security.every((c) => c.severity !== "critical" || c.pass),
        checks: security,
      },
    });
  } catch (err) {
    logApiError("/api/beta/monitoring", err, { method: "GET", userId: user.id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Monitoring failed" },
      { status: 500 }
    );
  }
}
