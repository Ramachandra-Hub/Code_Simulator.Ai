import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { analyzeResume, getLatestAnalysis } from "@/server/career-intelligence/services/resume-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const resumeId = url.searchParams.get("resumeId") || undefined;
  try {
    const analysis = await getLatestAnalysis(user.id, resumeId);
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, resumeId } = await req.json();
    const result = await analyzeResume(user.id, data, resumeId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Analysis failed" }, { status: 500 });
  }
}
