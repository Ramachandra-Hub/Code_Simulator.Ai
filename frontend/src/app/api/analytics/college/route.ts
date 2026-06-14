import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getCollegeAnalytics } from "@/server/career-intelligence/services/analytics-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const collegeId = new URL(req.url).searchParams.get("collegeId") || user.id;
  try {
    const analytics = await getCollegeAnalytics(collegeId);
    return NextResponse.json(analytics);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
