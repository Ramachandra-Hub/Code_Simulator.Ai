import { z } from "zod";

/** Extract first JSON object or array from LLM text (handles markdown fences). */
export function extractJsonBlock(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();

  const objStart = trimmed.indexOf("{");
  const arrStart = trimmed.indexOf("[");
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
  if (start === -1) return null;

  const opener = trimmed[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === opener) depth++;
    if (trimmed[i] === closer) {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }
  return null;
}

export function parseStructuredResponse<T>(
  raw: string,
  schema: z.ZodType<T>,
  fallback: T
): { data: T; valid: boolean; source: "llm" | "fallback" } {
  const block = extractJsonBlock(raw);
  if (!block) return { data: fallback, valid: false, source: "fallback" };

  try {
    const parsed = JSON.parse(block) as unknown;
    const result = schema.safeParse(parsed);
    if (result.success) return { data: result.data, valid: true, source: "llm" };
    return { data: fallback, valid: false, source: "fallback" };
  } catch {
    return { data: fallback, valid: false, source: "fallback" };
  }
}

export function cleanPlainText(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^```[\s\S]*?```$/gm, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0] || text.trim();
}
