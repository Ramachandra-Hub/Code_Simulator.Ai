import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { syncLinkedIn } from "@/server/career-intelligence/services/profile-integration-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const analysis = await syncLinkedIn(user.id);
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
