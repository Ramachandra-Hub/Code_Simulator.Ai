import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { getDsaRoadmap } from "@/server/coding-os/dsa-progress-service";
import "@/server/init";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getDsaRoadmap(user.id));
}
