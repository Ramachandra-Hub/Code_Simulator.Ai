import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getOfficeAnalytics } from "@/server/virtual-office/services/virtual-office-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const analytics = await getOfficeAnalytics(user.id);
  return NextResponse.json(analytics);
}
