import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { discussCodingAnswer } from "@/server/career-intelligence/services/coding-service";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { answer } = await req.json();
    if (!answer || String(answer).trim().length < 5) {
      return NextResponse.json({ error: "Answer too short" }, { status: 400 });
    }
    const result = await discussCodingAnswer(id, user.id, String(answer).trim());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Discuss failed" }, { status: 500 });
  }
}
