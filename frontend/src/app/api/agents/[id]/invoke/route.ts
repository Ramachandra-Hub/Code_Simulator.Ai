import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { AgentFactory } from "@/server/core/agent/agent-factory";
import "@/server/init";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  const { id } = await params;
  try {
    const input = await req.json();
    const agent = AgentFactory.create(id);
    const output = await agent.run(input, { userId: user?.id });
    return NextResponse.json(output);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invoke failed" }, { status: 500 });
  }
}
