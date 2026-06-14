import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { ensureRecruiterProfile, getRecruiterOverview } from "@/server/talent/services/talent-intelligence-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecruiterProfile(user.id);
  const overview = await getRecruiterOverview(user.id);
  return NextResponse.json(overview);
}
