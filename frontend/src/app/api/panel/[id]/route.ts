import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getPanelSession } from "@/server/career-intelligence/services/panel-interview-service";
import "@/server/init";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const session = await getPanelSession(id, user.id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}
