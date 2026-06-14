/** Whisper STT adapter — whisper.cpp or OpenAI-compatible endpoint */

export interface WhisperTranscribeResult {
  text: string;
  source: "whisper" | "empty";
  latencyMs: number;
}

export class WhisperAdapter {
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.WHISPER_URL || "http://localhost:9000").replace(/\/$/, "");
    this.timeoutMs = Number(process.env.WHISPER_TIMEOUT_MS || 30000);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      // try tags/root
    }
    try {
      const res = await fetch(this.baseUrl, { signal: AbortSignal.timeout(3000) });
      return res.ok || res.status === 404;
    } catch {
      return false;
    }
  }

  async transcribe(audioBase64: string, opts?: { language?: string }): Promise<WhisperTranscribeResult> {
    const start = Date.now();
    if (!audioBase64?.trim()) {
      return { text: "", source: "empty", latencyMs: 0 };
    }

    try {
      const res = await fetch(`${this.baseUrl}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: audioBase64,
          language: opts?.language || "en",
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (res.ok) {
        const data = (await res.json()) as { text?: string };
        return {
          text: (data.text || "").trim(),
          source: "whisper",
          latencyMs: Date.now() - start,
        };
      }
    } catch {
      // caller may fall back to browser STT
    }

    return { text: "", source: "empty", latencyMs: Date.now() - start };
  }
}

export const whisperAdapter = new WhisperAdapter();
