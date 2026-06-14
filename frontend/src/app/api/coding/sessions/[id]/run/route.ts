import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { runCodingCode } from "@/server/career-intelligence/services/coding-service";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { code, language, stdin } = await req.json();
    const result = await runCodingCode(id, user.id, code, language, stdin);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Run failed" }, { status: 500 });
  }
}
