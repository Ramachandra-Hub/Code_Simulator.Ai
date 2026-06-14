import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { isBetaAdmin } from "@/server/beta/beta-dashboard-service";
import { getProductionLaunchMetrics } from "@/server/beta/production-monitoring-service";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isBetaAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const hours = Number(searchParams.get("hours") || "24");
  const metrics = await getProductionLaunchMetrics(hours);
  return NextResponse.json(metrics);
}
