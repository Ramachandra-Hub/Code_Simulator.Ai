import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { setActiveResume } from "@/server/career-intelligence/services/resume-service";
import "@/server/init";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const resume = await setActiveResume(user.id, id);
    return NextResponse.json(resume);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 500 });
  }
}
