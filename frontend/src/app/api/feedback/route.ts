import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { submitFeedback, listFeedback, FEEDBACK_TYPES } from "@/server/beta/feedback-service";
import { isBetaAdmin } from "@/server/beta/beta-dashboard-service";
import "@/server/init";

const VALID_TYPES = new Set(Object.values(FEEDBACK_TYPES));

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!VALID_TYPES.has(body.type)) {
      return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    }
    const record = await submitFeedback(user.id, {
      type: body.type,
      rating: body.rating,
      message: body.message,
      context: body.context,
    });
    return NextResponse.json(record);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isBetaAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await listFeedback();
  return NextResponse.json(items);
}
