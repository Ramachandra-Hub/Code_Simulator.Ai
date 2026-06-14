import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { startPanelInterview } from "@/server/career-intelligence/services/panel-interview-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const result = await startPanelInterview(user.id, {
      resumeId: body.resumeId as string | undefined,
      mode: (body.mode as "voice" | "text") || "voice",
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
