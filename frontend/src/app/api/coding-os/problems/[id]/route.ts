import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getProblemById } from "@/server/coding-os/problem-service";
import "@/server/init";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const problem = await getProblemById(id, user.id);
  if (!problem) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ problem });
}
