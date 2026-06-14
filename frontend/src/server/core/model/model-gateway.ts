import type { ModelAdapter, ModelRequest, ModelResponse, EmbeddingResponse } from "./types";
import { OllamaAdapter } from "./adapters/ollama-adapter";
import { VLLMAdapter } from "./adapters/vllm-adapter";
import { ManagedAPIAdapter } from "./adapters/managed-api-adapter";
import { HeuristicFallbackAdapter } from "./adapters/heuristic-adapter";

class ModelGateway {
  private adapters: ModelAdapter[];
  private cache = new Map<string, ModelResponse>();
  private stats = { requests: 0, tokens: 0, failures: 0 };

  constructor() {
    this.adapters = [
      new OllamaAdapter(),
      new VLLMAdapter(),
      new ManagedAPIAdapter(),
      new HeuristicFallbackAdapter(),
    ];
  }

  private cacheKey(req: ModelRequest): string {
    return `${req.model || ""}::${req.system || ""}::${req.prompt}`;
  }

  /** Priority: Ollama → vLLM → OpenAI/Anthropic → Heuristic (last resort) */
  private getAdapterChain(): ModelAdapter[] {
    const provider = (process.env.MODEL_PROVIDER || "ollama").toLowerCase();
    const heuristic = this.adapters.find((a) => a.name === "heuristic")!;
    const withoutHeuristic = this.adapters.filter((a) => a.name !== "heuristic");

    if (provider === "heuristic") {
      return [heuristic];
    }

    if (provider === "ollama") {
      const ollama = this.adapters.find((a) => a.name === "ollama");
      return ollama ? [ollama, ...withoutHeuristic.filter((a) => a.name !== "ollama")] : withoutHeuristic;
    }

    if (provider === "vllm") {
      const vllm = this.adapters.find((a) => a.name === "vllm");
      return vllm
        ? [vllm, ...withoutHeuristic.filter((a) => a.name !== "vllm")]
        : withoutHeuristic;
    }

    if (provider === "openai" || provider === "anthropic" || provider === "managed") {
      const managed = this.adapters.find((a) => a.name === "managed-api");
      return managed
        ? [managed, ...withoutHeuristic.filter((a) => a.name !== "managed-api")]
        : withoutHeuristic;
    }

    // Default: full chain, heuristic only if everything else fails
    return [...withoutHeuristic, heuristic];
  }

  async complete(req: ModelRequest, retries = 2): Promise<ModelResponse> {
    this.stats.requests++;
    const key = this.cacheKey(req);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const chain = this.getAdapterChain();
    let lastError: Error | null = null;

    for (const adapter of chain.filter((a) => a.name !== "heuristic")) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const available = await adapter.isAvailable();
          if (!available) break;

          const response = await adapter.complete(req);
          this.stats.tokens += response.tokens || 0;
          this.cache.set(key, response);
          if (this.cache.size > 500) {
            const first = this.cache.keys().next().value;
            if (first) this.cache.delete(first);
          }
          return response;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (adapter.name === "ollama") {
            const { logOllamaError } = await import("../../beta/system-error-service");
            logOllamaError("model-gateway.complete", err, { model: req.model, attempt });
          }
          if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }

    this.stats.failures++;
    const fallback = new HeuristicFallbackAdapter();
    return fallback.complete(req);
  }

  async *stream(req: ModelRequest): AsyncGenerator<string> {
    for (const adapter of this.getAdapterChain()) {
      if (adapter.stream && (await adapter.isAvailable())) {
        yield* adapter.stream(req);
        return;
      }
    }
    const response = await this.complete(req);
    for (const word of response.text.split(" ")) {
      yield word + " ";
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  async embed(text: string): Promise<EmbeddingResponse> {
    for (const adapter of this.getAdapterChain()) {
      if (adapter.embed && (await adapter.isAvailable())) {
        return adapter.embed(text);
      }
    }
    const hash = text.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const vector = Array.from({ length: 384 }, (_, i) => Math.sin(hash + i) * 0.5);
    return { vector, model: "heuristic-embed" };
  }

  async getProviderStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    for (const adapter of this.adapters) {
      status[adapter.name] = await adapter.isAvailable();
    }
    return status;
  }

  getActiveProvider(): string {
    return process.env.MODEL_PROVIDER || "ollama";
  }

  async getOllamaInfo(): Promise<{ available: boolean; models: string[]; baseUrl: string; defaultModel: string }> {
    const ollama = this.adapters.find((a) => a.name === "ollama") as OllamaAdapter | undefined;
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const defaultModel = process.env.OLLAMA_MODEL || "qwen3:8b";
    if (!ollama) return { available: false, models: [], baseUrl, defaultModel };
    const available = await ollama.isAvailable();
    const models = available ? await ollama.listModels() : [];
    return { available, models, baseUrl, defaultModel };
  }

  getStats() {
    return { ...this.stats, provider: this.getActiveProvider() };
  }
}

export const modelGateway = new ModelGateway();
