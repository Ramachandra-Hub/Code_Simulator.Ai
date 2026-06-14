import { NextResponse } from "next/server";

/** Liveness probe — process is running (ECS/K8s) */
export async function GET() {
  return NextResponse.json({ status: "alive", timestamp: new Date().toISOString() });
}
