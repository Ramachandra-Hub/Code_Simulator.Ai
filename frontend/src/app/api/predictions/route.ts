import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";
import { getCareerOSOverview } from "@/server/career-os/services/career-os-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const latest = await prisma.placementPrediction.findMany({
    where: { userId: user.id },
    orderBy: { computedAt: "desc" },
    take: 3,
  });
  if (!latest.length) {
    const overview = await getCareerOSOverview(user.id);
    return NextResponse.json({ predictions: overview.placementForecast });
  }
  return NextResponse.json({ predictions: latest });
}
