import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { computeCodingAnalytics, getHistory } from "@/server/coding-os/analytics-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const analytics = await computeCodingAnalytics(user.id);
  return NextResponse.json({ analytics });
}
