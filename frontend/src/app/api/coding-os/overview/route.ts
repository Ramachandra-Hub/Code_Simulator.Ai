import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { listProblems, listTopics } from "@/server/coding-os/problem-service";
import { getDsaRoadmap } from "@/server/coding-os/dsa-progress-service";
import { computeCodingAnalytics } from "@/server/coding-os/analytics-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [topics, dsa, analytics] = await Promise.all([
    listTopics(),
    getDsaRoadmap(user.id),
    computeCodingAnalytics(user.id),
  ]);

  return NextResponse.json({
    topics,
    dsa,
    analytics,
    problemsSolved: analytics.problemsSolved,
    acceptanceRate: analytics.acceptanceRate,
    codingReadiness: analytics.codingReadiness,
  });
}
