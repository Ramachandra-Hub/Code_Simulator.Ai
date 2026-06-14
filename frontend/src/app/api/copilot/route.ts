import { NextResponse } from "next/server";
import { requireRecruiterAccess } from "@/server/talent/recruiter-auth";
import { ensureRecruiterProfile, runCopilotQuery } from "@/server/talent/services/talent-intelligence-service";
import { agentRegistry } from "@/server/core/agent/agent-registry";
import "@/server/init";

export async function POST(req: Request) {
  const user = await requireRecruiterAccess(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecruiterProfile(user.id);
  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const agent = agentRegistry.get("recruiter-copilot");
  if (agent) {
    const agentResult = await agent.run({ query }, { userId: user.id, sessionId: `copilot-${Date.now()}` });
    return NextResponse.json(agentResult.result);
  }

  const result = await runCopilotQuery(query, user.id);
  return NextResponse.json(result);
}
