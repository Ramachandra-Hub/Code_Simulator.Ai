import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getCareerCoachResults } from "@/server/career-intelligence/services/career-coach-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import { updateChecklistItem } from "@/server/beta/onboarding-service";
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
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
