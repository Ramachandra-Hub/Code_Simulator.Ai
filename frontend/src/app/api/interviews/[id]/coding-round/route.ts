import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { triggerCodingRoundFromInterview } from "@/server/career-intelligence/services/coding-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const result = await triggerCodingRoundFromInterview(id, user.id);
    await trackUsageEvent(ANALYTICS_EVENTS.CODING_ROUND_STARTED, user.id, {
      interviewId: id,
      codingSessionId: result.codingSessionId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Coding round failed" }, { status: 500 });
  }
}
