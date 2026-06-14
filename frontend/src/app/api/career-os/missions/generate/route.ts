import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { generateMissions } from "@/server/career-os/services/career-os-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const missions = await generateMissions(user.id);
  return NextResponse.json(missions);
}
