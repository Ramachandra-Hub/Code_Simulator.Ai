import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { synthesizeVoiceTts } from "@/server/career-intelligence/services/voice-interview-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { text, voiceProfile } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
    const result = await synthesizeVoiceTts(text, voiceProfile || "professional");
    return NextResponse.json({
      audio: result.audioBase64,
      source: result.source,
      useBrowserFallback: result.useBrowserFallback,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "TTS failed" }, { status: 500 });
  }
}
