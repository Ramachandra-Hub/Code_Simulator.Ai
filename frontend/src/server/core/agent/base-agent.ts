import type { AgentContext, AgentDefinition, AgentInput, AgentOutput } from "./types";
import { modelGateway } from "../model/model-gateway";
import { agentMemory } from "../memory/agent-memory";
import { agentCommunicationLayer } from "../comms/agent-communication-layer";
import { prisma } from "../db/prisma";
import { getAgentCache, setAgentCache } from "../redis/agent-cache";
import { withSpan } from "../observability/tracing";

export abstract class BaseAgent {
  abstract readonly definition: AgentDefinition;

  protected async recall(key: string, ctx: AgentContext): Promise<unknown> {
    return agentMemory.recall(ctx.userId || "system", key);
  }

  protected async remember(key: string, value: unknown, ctx: AgentContext): Promise<void> {
    await agentMemory.remember(ctx.userId || "system", key, value);
  }

  protected async complete(prompt: string, system?: string): Promise<string> {
    const res = await modelGateway.complete({ prompt, system });
    return res.text;
  }

  protected async handoff(targetAgentId: string, payload: AgentInput, confidence: number): Promise<AgentOutput> {
    return {
      result: null,
      confidence,
      handoff: { targetAgentId, payload },
    };
  }

  abstract execute(input: AgentInput, ctx: AgentContext): Promise<AgentOutput>;

  async run(input: AgentInput, ctx: AgentContext = {}): Promise<AgentOutput> {
    const start = Date.now();
    const cacheable = process.env.AGENT_CACHE_ENABLED !== "false";
    if (cacheable) {
      const cached = await getAgentCache<AgentOutput>(this.definition.id, input, ctx.userId);
      if (cached) return cached;
    }
    try {
      const output = await withSpan(
        `agent.${this.definition.id}`,
        () => this.execute(input, ctx),
        { category: "agent", route: this.definition.id, traceId: ctx.sessionId }
      );
      if (cacheable && output.confidence >= 0.7) {
        await setAgentCache(this.definition.id, input, output, ctx.userId);
      }
      const latencyMs = Date.now() - start;

      await prisma.agentRun.create({
        data: {
          agentId: this.definition.id,
          userId: ctx.userId,
          workflowId: ctx.workflowId,
          input: input as object,
          output: output as object,
          confidence: output.confidence,
          latencyMs,
          status: "completed",
        },
      }).catch(() => {});

      if (output.handoff) {
        await agentCommunicationLayer.send(
          this.definition.id,
          output.handoff.targetAgentId,
          output.handoff.payload
        );
      }

      return output;
    } catch (err) {
      const latencyMs = Date.now() - start;
      await prisma.agentRun.create({
        data: {
          agentId: this.definition.id,
          userId: ctx.userId,
          workflowId: ctx.workflowId,
          input: input as object,
          latencyMs,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }).catch(() => {});
      throw err;
    }
  }
}
