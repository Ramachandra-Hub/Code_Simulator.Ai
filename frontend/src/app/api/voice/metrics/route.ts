import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getVoiceMetrics } from "@/server/career-intelligence/services/voice-interview-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const voiceSessionId = url.searchParams.get("voiceSessionId");
  if (!voiceSessionId) {
    return NextResponse.json({ error: "voiceSessionId query param required" }, { status: 400 });
  }
  try {
    const metrics = await getVoiceMetrics(voiceSessionId, user.id);
    if (!metrics) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(metrics);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
