import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getPlacementDriveStatus } from "@/server/career-intelligence/services/placement-drive-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const company = url.searchParams.get("company") || undefined;

  try {
    const status = await getPlacementDriveStatus(user.id, company);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
