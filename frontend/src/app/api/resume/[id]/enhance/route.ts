import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { enhanceResume } from "@/server/career-intelligence/services/resume-service";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const resume = await enhanceResume(user.id, id);
    return NextResponse.json(resume);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Enhance failed" }, { status: 500 });
  }
}
