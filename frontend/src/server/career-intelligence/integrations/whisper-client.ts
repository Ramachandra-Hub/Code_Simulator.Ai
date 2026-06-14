const WHISPER_URL = process.env.WHISPER_URL || "http://localhost:9000";

class WhisperClient {
  async transcribe(audioBase64: string): Promise<string> {
    try {
      const res = await fetch(`${WHISPER_URL}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: audioBase64 }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.text || "";
      }
    } catch { /* fallback */ }
    return "";
  }
}

export const whisperClient = new WhisperClient();
