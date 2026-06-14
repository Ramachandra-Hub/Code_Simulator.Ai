import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { matchJobToCandidates } from "@/server/talent/services/talent-intelligence-service";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const matches = await matchJobToCandidates(id);
    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Match failed" }, { status: 500 });
  }
}
