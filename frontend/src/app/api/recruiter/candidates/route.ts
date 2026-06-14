import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { listTalentCandidates } from "@/server/talent/services/talent-intelligence-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "50");
  const candidates = await listTalentCandidates(Math.min(limit, 100));
  return NextResponse.json({ candidates });
}
