import type { AgentInput } from "./types";

interface WorkflowState {
  workflowId: string;
  userId?: string;
  currentAgent?: string;
  step: number;
  data: Record<string, unknown>;
  history: Array<{ agentId: string; input: AgentInput; output: unknown; at: string }>;
}

class AgentStateManager {
  private states = new Map<string, WorkflowState>();

  create(workflowId: string, userId?: string): WorkflowState {
    const state: WorkflowState = {
      workflowId,
      userId,
      step: 0,
      data: {},
      history: [],
    };
    this.states.set(workflowId, state);
    return state;
  }

  get(workflowId: string): WorkflowState | undefined {
    return this.states.get(workflowId);
  }

  update(workflowId: string, patch: Partial<WorkflowState>): WorkflowState {
    const current = this.states.get(workflowId) || this.create(workflowId);
    const updated = { ...current, ...patch, data: { ...current.data, ...patch.data } };
    this.states.set(workflowId, updated);
    return updated;
  }

  recordStep(workflowId: string, agentId: string, input: AgentInput, output: unknown): void {
    const state = this.states.get(workflowId);
    if (!state) return;
    state.history.push({ agentId, input, output, at: new Date().toISOString() });
    state.step += 1;
    state.currentAgent = agentId;
  }

  clear(workflowId: string): void {
    this.states.delete(workflowId);
  }
}

export const agentStateManager = new AgentStateManager();
