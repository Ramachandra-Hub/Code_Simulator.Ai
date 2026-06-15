import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { createSession, getSessions } from "@/server/career-intelligence/services/interview-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import { withPerformance } from "@/server/beta/performance-service";
import type { InterviewType } from "@prisma/client";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const sessions = await getSessions(user.id);
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { type, resumeId, companyPack } = await req.json();
    const result = await withPerformance("interview_generation", "/api/interviews", () =>
      createSession(user.id, type as InterviewType, resumeId, { companyPack }),
      "POST"
    );
    await trackUsageEvent(ANALYTICS_EVENTS.INTERVIEW_STARTED, user.id, {
      sessionId: result.session.id,
      type: result.session.type,
    });
    return NextResponse.json({
      id: result.session.id,
      type: result.session.type,
      status: result.session.status,
      targetRole: result.session.targetRole,
      firstQuestion: result.firstQuestion,
      codingSessionId: result.codingSessionId,
      progress: {
        questionIndex: 0,
        maxQuestions: 6,
        followUpCount: 0,
        difficulty: result.metadata.difficulty,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Create failed" }, { status: 500 });
  }
}
