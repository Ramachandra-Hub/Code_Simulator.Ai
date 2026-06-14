import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getOrCreateOfficeSession, runPerformanceReview } from "@/server/virtual-office/services/virtual-office-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getOrCreateOfficeSession(user.id);
  return NextResponse.json({ reviews: session.reviews });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const period = (body.period as "weekly" | "monthly") || "weekly";
  const review = await runPerformanceReview(user.id, period);
  return NextResponse.json(review);
}
