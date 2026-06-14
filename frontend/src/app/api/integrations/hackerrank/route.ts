import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { syncHackerRank } from "@/server/career-intelligence/services/profile-integration-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }
    const analysis = await syncHackerRank(user.id, username.trim());
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
