import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { saveResume, getResumes } from "@/server/career-intelligence/services/resume-service";
import { updateChecklistItem } from "@/server/beta/onboarding-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const resumes = await getResumes(user.id);
    return NextResponse.json(resumes);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { resumeId, ...data } = body;
    const resume = await saveResume(user.id, data, resumeId);
    void updateChecklistItem(user.id, "resume");
    return NextResponse.json(resume);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Save failed" }, { status: 500 });
  }
}
