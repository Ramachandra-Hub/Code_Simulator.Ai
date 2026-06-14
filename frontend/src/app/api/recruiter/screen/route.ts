import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { screenCandidate } from "@/server/career-intelligence/services/placement-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { candidateId } = await req.json();
  const result = await screenCandidate(candidateId);
  return NextResponse.json(result.result);
}
