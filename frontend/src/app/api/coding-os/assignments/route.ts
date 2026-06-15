import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.codingOsAssignment.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      items: { include: { problem: { select: { id: true, title: true, slug: true, difficulty: true } } } },
      submissions: { where: { userId: user.id }, take: 1 },
    },
  });

  return NextResponse.json({ assignments });
}
