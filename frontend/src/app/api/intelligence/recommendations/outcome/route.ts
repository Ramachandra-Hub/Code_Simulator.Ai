import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { recordRecommendationOutcome } from "@/server/intelligence/recommendation-intelligence-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

const VALID = new Set(["accepted", "dismissed", "ignored", "completed"]);

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const action = body.action as string;
    if (!VALID.has(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (!body.title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const latestPlacement = await prisma.placementReadiness.findFirst({
      where: { userId: user.id },
      orderBy: { computedAt: "desc" },
    });

    await recordRecommendationOutcome({
      userId: user.id,
      recommendationId: body.recommendationId,
      title: body.title,
      action: action as "accepted" | "dismissed" | "ignored" | "completed",
      placementBefore: latestPlacement?.overallScore,
      placementAfter: latestPlacement?.overallScore,
    });

    const eventMap: Record<string, string> = {
      accepted: ANALYTICS_EVENTS.RECOMMENDATION_ACCEPTED,
      dismissed: ANALYTICS_EVENTS.RECOMMENDATION_DISMISSED,
      completed: ANALYTICS_EVENTS.RECOMMENDATION_COMPLETED,
    };
    if (eventMap[action]) {
      void trackUsageEvent(eventMap[action], user.id, { title: body.title });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
