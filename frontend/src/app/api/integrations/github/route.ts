import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { syncGitHub } from "@/server/career-intelligence/services/profile-integration-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const analysis = await syncGitHub(user.id, body.username as string | undefined);
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
