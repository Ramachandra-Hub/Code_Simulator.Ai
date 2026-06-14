import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ user, profile });
}
