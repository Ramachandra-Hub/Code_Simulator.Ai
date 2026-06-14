import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getCareerCoachResults } from "@/server/career-intelligence/services/career-coach-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { roadmap, placementReadiness } = await getCareerCoachResults(user.id);
    if (!roadmap) {
      return NextResponse.json({ error: "No roadmap yet. Run POST /api/career/coach first." }, { status: 404 });
    }
    return NextResponse.json({ roadmap, placementReadiness });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
