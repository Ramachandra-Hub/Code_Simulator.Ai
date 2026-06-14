import { NextResponse } from "next/server";
import { AgentFactory } from "@/server/core/agent/agent-factory";
import "@/server/init";

export async function GET() {
  return NextResponse.json(AgentFactory.list());
}
