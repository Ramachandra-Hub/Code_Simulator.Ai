import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { stopVoiceInterview } from "@/server/career-intelligence/services/voice-interview-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { voiceSessionId } = await req.json();
    if (!voiceSessionId) return NextResponse.json({ error: "voiceSessionId required" }, { status: 400 });
    const result = await stopVoiceInterview(voiceSessionId, user.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Stop failed" }, { status: 500 });
  }
}
