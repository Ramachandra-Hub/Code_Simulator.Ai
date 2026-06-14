import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { ensureRecruiterProfile } from "@/server/talent/services/talent-intelligence-service";
import { prisma } from "@/server/core/db/prisma";
import "@/server/init";

export async function GET(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recruiter = await ensureRecruiterProfile(user.id);
  const jobs = await prisma.jobDescription.findMany({
    where: { recruiterId: recruiter.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recruiter = await ensureRecruiterProfile(user.id);
  const body = await req.json();
  if (!body.title || !body.description) {
    return NextResponse.json({ error: "title and description required" }, { status: 400 });
  }
  const job = await prisma.jobDescription.create({
    data: {
      recruiterId: recruiter.id,
      companyId: recruiter.companyId,
      title: body.title,
      description: body.description,
      skills: body.skills || [],
      location: body.location,
      status: "open",
    },
  });
  return NextResponse.json(job);
}
