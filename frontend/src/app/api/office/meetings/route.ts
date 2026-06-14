import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getOrCreateOfficeSession, scheduleMeeting } from "@/server/virtual-office/services/virtual-office-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getOrCreateOfficeSession(user.id);
  return NextResponse.json({ meetings: session.meetings });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const type = body.type as "sprint_planning" | "retrospective" | "client" | "design_review";
  if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });
  const meeting = await scheduleMeeting(user.id, type);
  return NextResponse.json(meeting);
}
