import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { evaluateAgainstTestCases } from "@/server/coding-os/judge-service";
import { runCodeReview } from "@/server/coding-os/code-review-service";
import { refreshDsaProgress, syncCodingTwin } from "@/server/coding-os/dsa-progress-service";
import type { CodeLanguage } from "@prisma/client";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const result = await evaluateAgainstTestCases(user.id, id, body.code, body.language as CodeLanguage, {
      contestId: body.contestId,
      assignmentId: body.assignmentId,
    });

    void refreshDsaProgress(user.id);
    const twinSync = await syncCodingTwin(user.id);
    const { agentEventBus } = await import("@/server/core/events/agent-event-bus");
    void agentEventBus.emit("coding.submitted", {
      userId: user.id,
      problemId: id,
      verdict: result.submission.verdict,
      passed: result.submission.verdict === "accepted",
      score: twinSync.codingReadiness,
      codingReadiness: twinSync.codingReadiness,
      problemsSolved: twinSync.problemsSolved,
    });
    const review = await runCodeReview(result.submission.id);

    return NextResponse.json({ ...result, review });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Submit failed" }, { status: 500 });
  }
}
