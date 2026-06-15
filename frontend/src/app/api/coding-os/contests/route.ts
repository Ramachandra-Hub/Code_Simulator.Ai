import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contests = await prisma.codingContest.findMany({
    orderBy: { startsAt: "desc" },
    take: 20,
    include: {
      company: { select: { name: true } },
      _count: { select: { entries: true, problems: true } },
    },
  });

  return NextResponse.json({ contests });
}
