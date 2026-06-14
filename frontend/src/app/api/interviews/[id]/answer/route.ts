import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { submitAnswer } from "@/server/career-intelligence/services/interview-service";
import { withPerformance } from "@/server/beta/performance-service";
import { logApiError } from "@/server/beta/system-error-service";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { answer } = await req.json();
    const result = await withPerformance(
      "interview_response",
      `/api/interviews/${id}/answer`,
      () => submitAnswer(id, user.id, answer),
      "POST"
    );
    return NextResponse.json(result);
  } catch (err) {
    logApiError(`/api/interviews/${id}/answer`, err, { method: "POST", userId: user.id });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Submit failed" }, { status: 500 });
  }
}
