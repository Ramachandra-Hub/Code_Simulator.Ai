import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { generateAndStoreProblem } from "@/server/coding-os/problem-generation-service";
import type { CodeDifficulty, CodeProblemCategory } from "@prisma/client";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const problem = await generateAndStoreProblem({
      userId: user.id,
      targetCompany: body.targetCompany,
      targetRole: body.targetRole,
      weakAreas: body.weakAreas,
      difficulty: body.difficulty as CodeDifficulty | undefined,
      category: body.category as CodeProblemCategory | undefined,
    });
    return NextResponse.json({ problem });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Generation failed" }, { status: 500 });
  }
}
