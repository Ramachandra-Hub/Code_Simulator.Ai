const XTTS_URL = process.env.XTTS_URL || "http://localhost:8020";

class XTTSClient {
  async synthesize(text: string, voiceId = "default"): Promise<string | null> {
    try {
      const res = await fetch(`${XTTS_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice_id: voiceId }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.audio_base64 || null;
      }
    } catch { /* fallback */ }
    return null;
  }
}

export const xttsClient = new XTTSClient();
