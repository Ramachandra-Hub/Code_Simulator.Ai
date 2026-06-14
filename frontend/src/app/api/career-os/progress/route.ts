import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getProgressHistory } from "@/server/career-os/services/career-os-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const history = await getProgressHistory(user.id);
  return NextResponse.json({ history });
}
