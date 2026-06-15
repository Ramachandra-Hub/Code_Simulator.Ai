import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { recordRun } from "@/server/coding-os/judge-service";
import type { CodeLanguage } from "@prisma/client";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const run = await recordRun(user.id, {
      problemId: id,
      code: body.code,
      language: body.language as CodeLanguage,
      stdin: body.stdin,
    });
    return NextResponse.json(run);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Run failed" }, { status: 500 });
  }
}
