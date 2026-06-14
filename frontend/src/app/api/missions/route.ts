import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";
import { generateMissions } from "@/server/career-os/services/career-os-service";
import "@/server/init";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [daily, weekly, monthly] = await Promise.all([
    prisma.dailyMission.findUnique({ where: { userId_date: { userId: user.id, date: startOfDay() } } }),
    prisma.weeklyMission.findUnique({ where: { userId_weekStart: { userId: user.id, weekStart: startOfWeek() } } }),
    prisma.monthlyMission.findUnique({ where: { userId_monthStart: { userId: user.id, monthStart: startOfMonth() } } }),
  ]);
  return NextResponse.json({ daily, weekly, monthly });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const missions = await generateMissions(user.id);
  return NextResponse.json(missions);
}
