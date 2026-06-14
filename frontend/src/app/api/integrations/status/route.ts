import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getIntegrationStatus } from "@/server/career-intelligence/services/profile-integration-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await getIntegrationStatus(user.id);
  return NextResponse.json({ integrations: status });
}
