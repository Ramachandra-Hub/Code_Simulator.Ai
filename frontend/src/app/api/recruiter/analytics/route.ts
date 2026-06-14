import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { getRecruiterAnalytics } from "@/server/talent/services/talent-intelligence-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const analytics = await getRecruiterAnalytics();
  return NextResponse.json(analytics);
}
