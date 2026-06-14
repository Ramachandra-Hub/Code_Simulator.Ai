import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { startVoiceInterview, isVoiceInterviewType } from "@/server/career-intelligence/services/voice-interview-service";
import { ANALYTICS_EVENTS, trackUsageEvent } from "@/server/beta/analytics-events";
import type { InterviewType } from "@prisma/client";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const type = body.type as InterviewType;
    if (!isVoiceInterviewType(type)) {
      return NextResponse.json(
        { error: "Voice mode supports: hr, technical, behavioral, system_design" },
        { status: 400 }
      );
    }
    const result = await startVoiceInterview(user.id, type, body.resumeId, body.voiceProfile || "professional");
    await trackUsageEvent(ANALYTICS_EVENTS.INTERVIEW_STARTED, user.id, {
      sessionId: result.interviewSessionId,
      type,
      mode: "voice",
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Start failed" }, { status: 500 });
  }
}
