import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { whisperAdapter } from "@/server/core/voice/adapters/whisper-adapter";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { audio, language } = await req.json();
    const result = await whisperAdapter.transcribe(audio, { language });
    return NextResponse.json({
      text: result.text,
      source: result.source,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "STT failed" }, { status: 500 });
  }
}
