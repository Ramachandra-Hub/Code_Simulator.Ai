import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { createCareerGoal, listGoals, GOAL_TEMPLATES } from "@/server/career-os/services/career-os-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const goals = await listGoals(user.id);
  return NextResponse.json({ goals, templates: GOAL_TEMPLATES });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const goal = await createCareerGoal(user.id, body);
  return NextResponse.json(goal);
}
