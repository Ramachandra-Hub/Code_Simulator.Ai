import type { ModelAdapter, ModelRequest, ModelResponse } from "../types";

interface OllamaChatResponse {
  message?: { content?: string; thinking?: string };
  eval_count?: number;
  prompt_eval_count?: number;
}

export class OllamaAdapter implements ModelAdapter {
  name = "ollama";
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
    this.defaultModel = process.env.OLLAMA_MODEL || "qwen3:8b";
    this.timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 60000);
    this.maxRetries = Number(process.env.OLLAMA_MAX_RETRIES || 3);
  }

  private resolveModel(req: ModelRequest): string {
    return req.model || this.defaultModel;
  }

  private buildMessages(req: ModelRequest) {
    const messages: Array<{ role: string; content: string }> = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    messages.push({ role: "user", content: req.prompt });
    return messages;
  }

  private shouldDisableThinking(model: string): boolean {
    if (process.env.OLLAMA_ENABLE_THINKING === "true") return false;
    return model.includes("qwen3") || model.includes("deepseek-r1");
  }

  private extractText(data: OllamaChatResponse): string {
    const content = (data.message?.content || "").trim();
    if (content) return content;
    // Qwen3 may return reasoning in thinking when content is empty
    const thinking = (data.message?.thinking || "").trim();
    if (!thinking) return "";
    // Use last sentence/line as best-effort fallback for short replies
    const lines = thinking.split(/[.\n]/).map((l) => l.trim()).filter(Boolean);
    return lines[lines.length - 1] || thinking.slice(0, 500);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      return (data.models || []).map((m) => m.name);
    } catch {
      return [];
    }
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const model = this.resolveModel(req);
    const start = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: this.buildMessages(req),
            stream: false,
            think: this.shouldDisableThinking(model) ? false : undefined,
            options: {
              temperature: req.temperature ?? 0.7,
              num_predict: req.maxTokens || 2048,
            },
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`Ollama error ${res.status}: ${body.slice(0, 200)}`);
        }

        const data = (await res.json()) as OllamaChatResponse;
        const text = this.extractText(data);

        return {
          text,
          model,
          tokens: (data.eval_count || 0) + (data.prompt_eval_count || 0),
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error("Ollama request failed");
  }

  async *stream(req: ModelRequest): AsyncGenerator<string> {
    const model = this.resolveModel(req);
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: this.buildMessages(req),
        stream: true,
        think: this.shouldDisableThinking(model) ? false : undefined,
        options: {
          temperature: req.temperature ?? 0.7,
          num_predict: req.maxTokens || 2048,
        },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Ollama stream error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Ollama stream: no response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed) as OllamaChatResponse;
          const piece = chunk.message?.content;
          if (piece) yield piece;
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
