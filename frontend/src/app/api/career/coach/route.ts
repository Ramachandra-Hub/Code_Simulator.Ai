import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { runCareerCoach, getCareerCoachResults } from "@/server/career-intelligence/services/career-coach-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import { updateChecklistItem } from "@/server/beta/onboarding-service";
import { withPerformance } from "@/server/beta/performance-service";
import { logApiError } from "@/server/beta/system-error-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await trackUsageEvent(ANALYTICS_EVENTS.CAREER_COACH_OPENED, user.id);
    void updateChecklistItem(user.id, "careerCoach");
    const results = await getCareerCoachResults(user.id);
    return NextResponse.json(results);
  } catch (err) {
    logApiError("/api/career/coach", err, { method: "GET", userId: user.id });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await withPerformance(
      "career_coach",
      "/api/career/coach",
      () => runCareerCoach(user.id),
      "POST"
    );
    return NextResponse.json(result);
  } catch (err) {
    logApiError("/api/career/coach", err, { method: "POST", userId: user.id });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Coach failed" }, { status: 500 });
  }
}
