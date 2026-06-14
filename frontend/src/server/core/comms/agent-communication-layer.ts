import type { AgentInput } from "../agent/types";
import { AgentFactory } from "../agent/agent-factory";
import { agentStateManager } from "../agent/agent-state-manager";

class AgentCommunicationLayer {
  private messages: Array<{
    from: string;
    to: string;
    payload: AgentInput;
    at: string;
  }> = [];

  async send(fromAgentId: string, toAgentId: string, payload: AgentInput): Promise<unknown> {
    this.messages.push({ from: fromAgentId, to: toAgentId, payload, at: new Date().toISOString() });

    const target = AgentFactory.create(toAgentId);
    const workflowId = `handoff_${Date.now()}`;
    const state = agentStateManager.create(workflowId);
    state.currentAgent = toAgentId;

    const output = await target.run(payload, { workflowId });
    agentStateManager.recordStep(workflowId, toAgentId, payload, output);
    return output;
  }

  getHistory(): typeof this.messages {
    return [...this.messages];
  }
}

export const agentCommunicationLayer = new AgentCommunicationLayer();
