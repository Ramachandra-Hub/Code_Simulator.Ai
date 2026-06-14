const EMBEDDING_DIM = 384;
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

/** Deterministic fallback when Ollama embeddings unavailable */
function hashEmbed(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    vec[i % EMBEDDING_DIM] += Math.sin(c + i * 0.1);
    vec[(i * 7) % EMBEDDING_DIM] += Math.cos(c * 0.5);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedText(text: string): Promise<{ vector: number[]; source: "ollama" | "fallback" }> {
  if (!text.trim()) return { vector: hashEmbed("empty"), source: "fallback" };

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: text.slice(0, 8000) }),
      signal: AbortSignal.timeout(Number(process.env.OLLAMA_TIMEOUT_MS || "30000")),
    });
    if (!res.ok) return { vector: hashEmbed(text), source: "fallback" };
    const data = (await res.json()) as { embedding?: number[] };
    if (data.embedding?.length) {
      const v = data.embedding.slice(0, EMBEDDING_DIM);
      while (v.length < EMBEDDING_DIM) v.push(0);
      return { vector: v, source: "ollama" };
    }
  } catch {
    /* fallback */
  }
  return { vector: hashEmbed(text), source: "fallback" };
}

export function embeddingDimension(): number {
  return EMBEDDING_DIM;
}
