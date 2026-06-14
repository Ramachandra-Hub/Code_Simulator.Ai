import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const job = await prisma.jobDescription.findUnique({
    where: { id },
    include: { matches: { orderBy: { ranking: "asc" }, take: 30 } },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const job = await prisma.jobDescription.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      skills: body.skills,
      location: body.location,
      status: body.status,
    },
  });
  return NextResponse.json(job);
}
