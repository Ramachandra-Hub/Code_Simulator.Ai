import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { createRecruiterPipeline } from "@/server/career-intelligence/services/placement-service";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pipelines = await prisma.recruiterPipeline.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(pipelines);
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, companyId } = await req.json();
  const pipeline = await createRecruiterPipeline(name, companyId);
  return NextResponse.json(pipeline);
}
