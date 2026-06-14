import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getOrCreateOfficeSession, submitCodeReview } from "@/server/virtual-office/services/virtual-office-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getOrCreateOfficeSession(user.id);
  return NextResponse.json({ codeReviews: session.codeReviews });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.code) return NextResponse.json({ error: "code is required" }, { status: 400 });
  const review = await submitCodeReview(user.id, body);
  return NextResponse.json(review);
}
