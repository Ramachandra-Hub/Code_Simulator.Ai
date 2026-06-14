import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { recordPerformanceMetric } from "@/server/beta/performance-service";
import "@/server/init";

const ALLOWED_CATEGORIES = new Set(["page_load", "client_api"]);

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const route = String(body.route || "").slice(0, 200);
    const durationMs = Math.min(Math.max(0, Number(body.durationMs) || 0), 120000);
    const category = ALLOWED_CATEGORIES.has(body.category) ? body.category : "page_load";
    if (!route || durationMs <= 0) {
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }
    await recordPerformanceMetric({
      route,
      category,
      durationMs,
      method: "POST",
      metadata: { userId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
