import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";
import { getCareerOSOverview } from "@/server/career-os/services/career-os-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const history = await prisma.futurePotentialSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { computedAt: "desc" },
    take: 12,
  });
  if (!history.length) {
    const overview = await getCareerOSOverview(user.id);
    return NextResponse.json({
      currentPotential: overview.currentPotential,
      futurePotential: overview.futurePotential,
      history: [],
    });
  }
  const latest = history[0];
  return NextResponse.json({
    currentPotential: latest.currentPotential,
    futurePotential: latest.futurePotential,
    growthCeiling: latest.growthCeiling,
    leadershipPotential: latest.leadershipPotential,
    technicalPotential: latest.technicalPotential,
    tier: latest.tier,
    history,
  });
}
