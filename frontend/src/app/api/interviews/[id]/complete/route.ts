import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { completeSession } from "@/server/career-intelligence/services/interview-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import { updateChecklistItem } from "@/server/beta/onboarding-service";
import { withPerformance } from "@/server/beta/performance-service";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await withPerformance("interview_generation", `/api/interviews/${id}/complete`, () =>
      completeSession(id, user.id),
      "POST"
    );
    await trackUsageEvent(ANALYTICS_EVENTS.INTERVIEW_COMPLETED, user.id, { sessionId: id });
    void updateChecklistItem(user.id, "interview");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Complete failed" }, { status: 500 });
  }
}
