import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { processPanelVoiceTranscript } from "@/server/career-intelligence/services/panel-interview-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await processPanelVoiceTranscript({
      panelSessionId: body.panelSessionId,
      userId: user.id,
      transcript: body.transcript,
      audioBase64: body.audioBase64,
      audioDurationMs: body.audioDurationMs,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = message.toLowerCase().includes("empty transcript") ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
