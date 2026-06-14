import type { BaseAgent } from "./base-agent";
import { agentRegistry } from "./agent-registry";

export class AgentFactory {
  static create(agentId: string): BaseAgent {
    const agent = agentRegistry.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    return agent;
  }

  static list(): ReturnType<typeof agentRegistry.list> {
    return agentRegistry.list();
  }
}
