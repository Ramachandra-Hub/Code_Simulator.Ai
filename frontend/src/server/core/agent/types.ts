export interface AgentContext {
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentInput {
  [key: string]: unknown;
}

export interface AgentOutput {
  result: unknown;
  confidence: number;
  handoff?: {
    targetAgentId: string;
    payload: AgentInput;
  };
  metadata?: Record<string, unknown>;
}

export interface AgentDefinition {
  id: string;
  name: string;
  objective: string;
  category: string;
  evaluationRules: string[];
  tools: string[];
}

export interface AgentRunRecord {
  agentId: string;
  input: AgentInput;
  output: AgentOutput;
  latencyMs: number;
  model?: string;
  tokens?: number;
}
