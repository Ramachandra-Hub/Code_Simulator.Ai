import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { createCodingSession } from "@/server/career-intelligence/services/coding-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await createCodingSession(user.id, {
      interviewSessionId: body.interviewSessionId,
      targetRole: body.targetRole,
      difficulty: body.difficulty,
      language: body.language,
      resumeId: body.resumeId,
    });

    return NextResponse.json({
      id: result.session.id,
      status: result.session.status,
      targetRole: result.session.targetRole,
      difficulty: result.session.difficulty,
      language: result.session.language,
      problem: result.problem,
      starterCode: result.starterCode,
      interviewSessionId: result.session.interviewSessionId,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Create failed" }, { status: 500 });
  }
}
