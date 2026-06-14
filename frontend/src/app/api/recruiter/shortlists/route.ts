import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { listShortlists, upsertShortlist } from "@/server/talent/services/talent-intelligence-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shortlists = await listShortlists(user.id);
  return NextResponse.json({ shortlists });
}

export async function POST(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.candidateId) return NextResponse.json({ error: "candidateId required" }, { status: 400 });
  const entry = await upsertShortlist(user.id, body);
  return NextResponse.json(entry);
}
