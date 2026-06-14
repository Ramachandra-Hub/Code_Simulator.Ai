import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { synthesizePanelSpeech } from "@/server/career-intelligence/services/panel-interview-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { text, voiceId } = await req.json();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
    const result = await synthesizePanelSpeech(text, voiceId || "professional_en");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
