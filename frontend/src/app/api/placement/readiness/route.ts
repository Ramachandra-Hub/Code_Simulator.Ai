import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { computePlacementReadiness } from "@/server/career-intelligence/services/placement-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const readiness = await computePlacementReadiness(user.id);
    return NextResponse.json(readiness);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
