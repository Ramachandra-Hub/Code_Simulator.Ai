import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/lib/auth";
import { AgentFactory } from "@/server/core/agent/agent-factory";
import { agentEventBus } from "@/server/core/events/agent-event-bus";
import "@/server/init";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  try {
    const { code, language, sessionId } = await req.json();
    const agent = AgentFactory.create("coding-evaluation");
    const result = await agent.run({ code, language }, { userId: user?.id, sessionId });
    const evalResult = result.result as { passed?: boolean; verdict?: string };
    if (user) {
      await agentEventBus.emit("coding.submitted", {
        userId: user.id,
        passed: evalResult.passed,
        verdict: evalResult.verdict,
        language,
        sessionId,
      });
    }
    return NextResponse.json(result.result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Submit failed" }, { status: 500 });
  }
}
