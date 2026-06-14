import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getOrCreateOfficeSession, submitStandup } from "@/server/virtual-office/services/virtual-office-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getOrCreateOfficeSession(user.id);
  return NextResponse.json({ standups: session.standups });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.yesterday || !body.today) {
    return NextResponse.json({ error: "yesterday and today are required" }, { status: 400 });
  }
  const report = await submitStandup(user.id, body);
  return NextResponse.json(report);
}
