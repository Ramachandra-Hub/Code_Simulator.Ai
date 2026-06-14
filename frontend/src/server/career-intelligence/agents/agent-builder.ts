import { BaseAgent } from "../../core/agent/base-agent";
import type { AgentContext, AgentDefinition, AgentInput, AgentOutput } from "../../core/agent/types";

export function createAgent(def: AgentDefinition, executor: (input: AgentInput, ctx: AgentContext, complete: (p: string, s?: string) => Promise<string>) => Promise<AgentOutput>): BaseAgent {
  return new (class extends BaseAgent {
    readonly definition = def;
    async execute(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
      return executor(input, ctx, (p, s) => this.complete(p, s));
    }
  })();
}
