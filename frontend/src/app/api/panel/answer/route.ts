import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { submitPanelAnswer } from "@/server/career-intelligence/services/panel-interview-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { panelSessionId, answer } = await req.json();
    if (!panelSessionId || !answer) {
      return NextResponse.json({ error: "panelSessionId and answer required" }, { status: 400 });
    }
    const result = await submitPanelAnswer({ panelSessionId, userId: user.id, answer });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
