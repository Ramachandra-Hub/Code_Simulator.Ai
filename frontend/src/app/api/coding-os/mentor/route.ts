import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getCodingMentorResponse } from "@/server/coding-os/mentor-service";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const reply = await getCodingMentorResponse(user.id, {
      message: String(body.message || ""),
      problemId: body.problemId as string | undefined,
      mode: body.mode as "explain" | "plan" | "company" | undefined,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Mentor failed" }, { status: 500 });
  }
}
