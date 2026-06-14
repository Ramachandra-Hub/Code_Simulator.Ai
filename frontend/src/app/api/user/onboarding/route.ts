import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import {
  getOnboarding,
  markWelcomeSeen,
  markTourCompleted,
  updateChecklistItem,
  type ChecklistKey,
} from "@/server/beta/onboarding-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const onboarding = await getOnboarding(user.id);
    return NextResponse.json(onboarding);
  } catch (err) {
    console.error("[user/onboarding]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Onboarding failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.welcomeSeen) await markWelcomeSeen(user.id);
    if (body.tourCompleted) await markTourCompleted(user.id);
    if (body.checklistKey) {
      await updateChecklistItem(user.id, body.checklistKey as ChecklistKey, body.done !== false);
    }
    const onboarding = await getOnboarding(user.id);
    return NextResponse.json(onboarding);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 500 });
  }
}
