import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { prisma } from "@/server/core/db/prisma";
import { gatherCandidateIntelligence } from "@/server/talent/services/talent-intelligence-service";
import "@/server/init";

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await params;
  const matches = await prisma.talentMatch.findMany({
    where: { jobId },
    orderBy: { ranking: "asc" },
  });
  const enriched = await Promise.all(
    matches.map(async (m) => {
      const intel = await gatherCandidateIntelligence(m.candidateId);
      return { ...m, candidate: intel };
    })
  );
  return NextResponse.json({ matches: enriched });
}
