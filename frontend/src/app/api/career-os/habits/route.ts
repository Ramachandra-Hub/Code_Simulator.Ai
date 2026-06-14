import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getHabitCoaching, logHabit } from "@/server/career-os/services/career-os-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coaching = await getHabitCoaching(user.id);
  return NextResponse.json(coaching);
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { habitType } = await req.json();
  if (!habitType) return NextResponse.json({ error: "habitType required" }, { status: 400 });
  const habit = await logHabit(user.id, habitType);
  return NextResponse.json(habit);
}
