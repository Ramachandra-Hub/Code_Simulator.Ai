import { prisma } from "../core/db/prisma";

export const ANALYTICS_EVENTS = {
  INTERVIEW_STARTED: "interview_started",
  INTERVIEW_COMPLETED: "interview_completed",
  CODING_ROUND_STARTED: "coding_round_started",
  CODING_ROUND_COMPLETED: "coding_round_completed",
  CAREER_COACH_OPENED: "career_coach_opened",
  PDF_DOWNLOADED: "pdf_downloaded",
  RECOMMENDATION_ACCEPTED: "recommendation_accepted",
  RECOMMENDATION_DISMISSED: "recommendation_dismissed",
  RECOMMENDATION_COMPLETED: "recommendation_completed",
  ROADMAP_ITEM_COMPLETED: "roadmap_item_completed",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export async function trackUsageEvent(
  event: AnalyticsEventName | string,
  userId?: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.usageEvent.create({
      data: {
        userId: userId || null,
        event,
        metadata: metadata as object | undefined,
      },
    });
  } catch {
    // analytics must not break user flows
  }
}
