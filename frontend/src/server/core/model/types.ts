export interface ModelRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** Per-request model override (e.g. qwen3:8b, deepseek-r1:8b) */
  model?: string;
}

export interface ModelResponse {
  text: string;
  model: string;
  tokens?: number;
  latencyMs: number;
}

export interface EmbeddingResponse {
  vector: number[];
  model: string;
}

export interface ModelAdapter {
  name: string;
  complete(req: ModelRequest): Promise<ModelResponse>;
  stream?(req: ModelRequest): AsyncGenerator<string>;
  embed?(text: string): Promise<EmbeddingResponse>;
  isAvailable(): Promise<boolean>;
}
