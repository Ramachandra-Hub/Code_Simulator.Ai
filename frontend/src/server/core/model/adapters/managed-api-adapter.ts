import type { ModelAdapter, ModelRequest, ModelResponse } from "../types";

function resolveOpenAiModel(req: ModelRequest): string {
  const requested = req.model || "";
  if (requested.startsWith("gpt-") || requested.startsWith("o1") || requested.startsWith("o3")) {
    return requested;
  }
  const reasoningHint = /reason|deepseek|think|evaluate|analysis/i.test(
    `${req.system || ""} ${req.prompt}`.slice(0, 500)
  );
  if (reasoningHint) {
    return process.env.OPENAI_MODEL_REASONING || process.env.OPENAI_MODEL || "gpt-4o";
  }
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export class ManagedAPIAdapter implements ModelAdapter {
  name = "managed-api";

  async isAvailable(): Promise<boolean> {
    return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const start = Date.now();

    if (process.env.OPENAI_API_KEY) {
      const messages: { role: string; content: string }[] = [];
      if (req.system) messages.push({ role: "system", content: req.system });
      messages.push({ role: "user", content: req.prompt });

      const model = resolveOpenAiModel(req);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: req.maxTokens || 2048,
          temperature: req.temperature ?? 0.7,
        }),
        signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS || 120000)),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`OpenAI error: ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`);
      }
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || "",
        model,
        tokens: data.usage?.total_tokens,
        latencyMs: Date.now() - start,
      };
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
          max_tokens: req.maxTokens || 2048,
          system: req.system,
          messages: [{ role: "user", content: req.prompt }],
        }),
        signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS || 120000)),
      });
      if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
      const data = await res.json();
      return {
        text: data.content?.[0]?.text || "",
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku",
        tokens: data.usage?.input_tokens + data.usage?.output_tokens,
        latencyMs: Date.now() - start,
      };
    }

    throw new Error("No managed API key configured");
  }
}
