import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const datasets = await prisma.sqlDataset.findMany({
    include: { challenges: { where: { isPublished: true } } },
  });

  return NextResponse.json({ datasets });
}
