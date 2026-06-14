import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { gatherCandidateIntelligence } from "@/server/talent/services/talent-intelligence-service";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;
  const intel = await gatherCandidateIntelligence(userId);
  if (!intel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const history = await prisma.growthPotentialSnapshot.findMany({
    where: { userId },
    orderBy: { computedAt: "desc" },
    take: 12,
  });
  return NextResponse.json({
    score: intel.growthPotentialScore,
    tier: intel.growthTier,
    history,
  });
}
