import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { processVoiceTranscript } from "@/server/career-intelligence/services/voice-interview-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.voiceSessionId) {
      return NextResponse.json({ error: "voiceSessionId required" }, { status: 400 });
    }
    const result = await processVoiceTranscript({
      voiceSessionId: body.voiceSessionId,
      userId: user.id,
      transcript: body.transcript || "",
      audioDurationMs: body.audioDurationMs,
      audioBase64: body.audioBase64,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Transcript failed" }, { status: 500 });
  }
}
