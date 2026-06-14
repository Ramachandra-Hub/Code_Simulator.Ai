import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { completeMeeting } from "@/server/virtual-office/services/virtual-office-service";
import "@/server/init";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const meeting = await completeMeeting(user.id, id, body);
    return NextResponse.json(meeting);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
