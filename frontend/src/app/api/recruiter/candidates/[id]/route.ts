import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import {
  gatherCandidateIntelligence,
  generateInterviewPlan,
} from "@/server/talent/services/talent-intelligence-service";
import { computeHiringRecommendation } from "@/server/talent/engines/hiring-recommendation-engine";
import "@/server/init";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const intel = await gatherCandidateIntelligence(id);
  if (!intel) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const hiring = computeHiringRecommendation({
    placementReadiness: intel.placementReadiness,
    growthPotentialScore: intel.growthPotentialScore,
    careerVelocityScore: intel.careerVelocityScore,
    panelReadiness: intel.panelReadiness,
    professionalReadiness: intel.professionalReadiness,
    twinStrengths: intel.digitalTwinSummary.strengths,
    twinWeaknesses: intel.digitalTwinSummary.weaknesses,
  });

  return NextResponse.json({
    ...intel,
    hiring,
    interviewPlan: generateInterviewPlan(intel),
  });
}
