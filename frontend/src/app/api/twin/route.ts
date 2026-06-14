import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getTwin } from "@/server/career-intelligence/services/twin-service";
import { updateChecklistItem } from "@/server/beta/onboarding-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const twin = await getTwin(user.id);
    void updateChecklistItem(user.id, "twin");
    return NextResponse.json(twin);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Twin failed" }, { status: 500 });
  }
}
