import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const questions = await prisma.mcqQuestion.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const question = await prisma.mcqQuestion.findUnique({ where: { id: body.questionId } });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const correct = body.selectedIndex === question.correctIndex;
  const attempt = await prisma.mcqAttempt.create({
    data: {
      userId: user.id,
      questionId: question.id,
      selectedIndex: body.selectedIndex,
      correct,
    },
  });

  return NextResponse.json({
    correct,
    explanation: question.explanation,
    attempt,
  });
}
