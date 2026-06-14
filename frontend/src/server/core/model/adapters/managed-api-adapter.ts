import type { ModelAdapter, ModelRequest, ModelResponse } from "../types";

export class ManagedAPIAdapter implements ModelAdapter {
  name = "managed-api";

  async isAvailable(): Promise<boolean> {
    return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const start = Date.now();

    if (process.env.OPENAI_API_KEY) {
      const messages = [];
      if (req.system) messages.push({ role: "system", content: req.system });
      messages.push({ role: "user", content: req.prompt });

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: req.maxTokens || 2048,
          temperature: req.temperature ?? 0.7,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || "",
        model: "gpt-4o-mini",
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
          model: "claude-3-5-haiku-20241022",
          max_tokens: req.maxTokens || 2048,
          system: req.system,
          messages: [{ role: "user", content: req.prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
      const data = await res.json();
      return {
        text: data.content?.[0]?.text || "",
        model: "claude-3-5-haiku",
        tokens: data.usage?.input_tokens + data.usage?.output_tokens,
        latencyMs: Date.now() - start,
      };
    }

    throw new Error("No managed API key configured");
  }
}
