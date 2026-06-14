import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getProfessionalIntelligenceDashboard } from "@/server/career-intelligence/services/professional-intelligence-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getProfessionalIntelligenceDashboard(user.id);
  return NextResponse.json(data);
}
