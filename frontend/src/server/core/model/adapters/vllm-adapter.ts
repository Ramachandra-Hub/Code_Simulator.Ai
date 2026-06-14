import type { ModelAdapter, ModelRequest, ModelResponse, EmbeddingResponse } from "../types";

export class VLLMAdapter implements ModelAdapter {
  name = "vllm";
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.VLLM_BASE_URL || "http://localhost:8000/v1";
    this.model = process.env.VLLM_MODEL || process.env.QWEN_MODEL || "deepseek-ai/DeepSeek-V2.5";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const start = Date.now();
    const messages = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    messages.push({ role: "user", content: req.prompt });

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: req.maxTokens || 2048,
        temperature: req.temperature ?? 0.7,
      }),
    });

    if (!res.ok) throw new Error(`vLLM error: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    return {
      text,
      model: this.model,
      tokens: data.usage?.total_tokens,
      latencyMs: Date.now() - start,
    };
  }

  async embed(text: string): Promise<EmbeddingResponse> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: text }),
    });
    if (!res.ok) throw new Error(`vLLM embed error: ${res.status}`);
    const data = await res.json();
    return { vector: data.data?.[0]?.embedding || [], model: this.model };
  }
}
