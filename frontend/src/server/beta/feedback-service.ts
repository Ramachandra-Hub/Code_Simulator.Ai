import { prisma } from "../core/db/prisma";

export const FEEDBACK_TYPES = {
  REPORT_ISSUE: "report_issue",
  SUGGEST_IMPROVEMENT: "suggest_improvement",
  RATE_INTERVIEW: "rate_interview",
  RATE_CAREER_COACH: "rate_career_coach",
} as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[keyof typeof FEEDBACK_TYPES];

export async function submitFeedback(
  userId: string,
  input: {
    type: FeedbackType;
    rating?: number;
    message?: string;
    context?: Record<string, unknown>;
  }
) {
  if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
    throw new Error("Rating must be between 1 and 5");
  }
  const record = await prisma.userFeedback.create({
    data: {
      userId,
      type: input.type,
      rating: input.rating,
      message: input.message,
      context: input.context as object | undefined,
    },
  });

  if (input.type === FEEDBACK_TYPES.RATE_INTERVIEW && input.rating) {
    const ctx = (input.context || {}) as { interviewId?: string };
    if (ctx.interviewId) {
      const { applyInterviewRatingToQuestions } = await import("../intelligence/question-intelligence-service");
      void applyInterviewRatingToQuestions(ctx.interviewId, input.rating);
    }
  }
  if (input.type === FEEDBACK_TYPES.RATE_CAREER_COACH && input.rating) {
    const { correlateCoachRating } = await import("../intelligence/recommendation-intelligence-service");
    void correlateCoachRating(userId, input.rating);
  }

  return record;
}

export async function listFeedback(limit = 50) {
  return prisma.userFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true, role: true } } },
  });
}
