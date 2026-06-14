import type { BaseAgent } from "./base-agent";
import type { AgentDefinition } from "./types";

class AgentRegistry {
  private agents = new Map<string, BaseAgent>();

  register(agent: BaseAgent): void {
    this.agents.set(agent.definition.id, agent);
  }

  get(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  list(): AgentDefinition[] {
    return this.getAll().map((a) => a.definition);
  }

  getByCategory(category: string): BaseAgent[] {
    return this.getAll().filter((a) => a.definition.category === category);
  }
}

export const agentRegistry = new AgentRegistry();
