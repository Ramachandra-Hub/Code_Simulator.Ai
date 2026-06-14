import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";
import { recordRecommendationOutcome } from "@/server/intelligence/recommendation-intelligence-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { itemId } = await req.json();
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const item = await prisma.roadmapItem.findFirst({
      where: { id: itemId, roadmap: { userId: user.id } },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.roadmapItem.update({
      where: { id: itemId },
      data: { status: "completed" },
    });

    void recordRecommendationOutcome({
      userId: user.id,
      title: item.title,
      action: "completed",
    });
    void trackUsageEvent(ANALYTICS_EVENTS.ROADMAP_ITEM_COMPLETED, user.id, { itemId, title: item.title });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
