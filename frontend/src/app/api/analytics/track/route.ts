import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { trackUsageEvent, ANALYTICS_EVENTS } from "@/server/beta/analytics-events";
import "@/server/init";

const CLIENT_EVENTS = new Set(Object.values(ANALYTICS_EVENTS));

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { event, metadata } = await req.json();
    if (!event || !CLIENT_EVENTS.has(event)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    await trackUsageEvent(event, user.id, metadata);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Track failed" }, { status: 500 });
  }
}
