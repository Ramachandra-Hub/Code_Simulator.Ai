/** TTS adapter — XTTS-v2 server with browser synthesis fallback hint */

export type VoiceProfile = "male" | "female" | "professional";

export interface TtsResult {
  audioBase64: string | null;
  source: "xtts" | "browser_fallback";
  voiceId: string;
  latencyMs: number;
}

const VOICE_MAP: Record<VoiceProfile, string> = {
  male: "male_en",
  female: "female_en",
  professional: "professional_en",
};

export class TTSAdapter {
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.XTTS_URL || "http://localhost:8020").replace(/\/$/, "");
    this.timeoutMs = Number(process.env.XTTS_TIMEOUT_MS || 30000);
  }

  resolveVoiceId(profile: VoiceProfile | string): string {
    if (profile in VOICE_MAP) return VOICE_MAP[profile as VoiceProfile];
    return profile || VOICE_MAP.professional;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async synthesize(text: string, voiceProfile: VoiceProfile | string = "professional"): Promise<TtsResult> {
    const start = Date.now();
    const voiceId = this.resolveVoiceId(voiceProfile);
    const trimmed = text.trim().replace(/[#*_`~[\]{}|\\^]/g, " ").replace(/\s+/g, " ").trim();
    if (!trimmed) {
      return { audioBase64: null, source: "browser_fallback", voiceId, latencyMs: 0 };
    }

    try {
      const res = await fetch(`${this.baseUrl}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, voice_id: voiceId }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (res.ok) {
        const data = (await res.json()) as { audio_base64?: string };
        if (data.audio_base64) {
          return {
            audioBase64: data.audio_base64,
            source: "xtts",
            voiceId,
            latencyMs: Date.now() - start,
          };
        }
      }
    } catch {
      // client uses browser Speech Synthesis
    }

    return {
      audioBase64: null,
      source: "browser_fallback",
      voiceId,
      latencyMs: Date.now() - start,
    };
  }
}

export const ttsAdapter = new TTSAdapter();
