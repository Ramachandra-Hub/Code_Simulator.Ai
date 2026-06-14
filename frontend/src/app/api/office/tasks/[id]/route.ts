import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { completeTask } from "@/server/virtual-office/services/virtual-office-service";
import "@/server/init";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const task = await completeTask(user.id, id);
    return NextResponse.json(task);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
