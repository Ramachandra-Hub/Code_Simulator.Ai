import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { listProblems } from "@/server/coding-os/problem-service";
import type { CodeDifficulty, CodeProblemCategory } from "@prisma/client";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const problems = await listProblems({
    topicSlug: searchParams.get("topic") || undefined,
    category: (searchParams.get("category") as CodeProblemCategory) || undefined,
    difficulty: (searchParams.get("difficulty") as CodeDifficulty) || undefined,
    company: searchParams.get("company") || undefined,
    search: searchParams.get("q") || undefined,
    limit: Number(searchParams.get("limit") || 50),
  });

  return NextResponse.json({ problems });
}
