import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getOrCreateOfficeSession, generateOfficeTasks } from "@/server/virtual-office/services/virtual-office-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getOrCreateOfficeSession(user.id);
  return NextResponse.json({ tasks: session.tasks });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await generateOfficeTasks(user.id);
  return NextResponse.json({ tasks });
}
