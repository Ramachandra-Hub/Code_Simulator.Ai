/** Panelist TTS — distinct natural voices, one question at a time. */

import { sanitizeForSpeech } from "./speech-sanitize";
import { PANEL_SPEECH_PROFILES, speakNaturally } from "./natural-speech";

export const PANEL_BROWSER_VOICES = PANEL_SPEECH_PROFILES;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function speakPanelText(
  text: string,
  voiceId: string,
  tts?: { audioBase64: string | null; useBrowserFallback?: boolean }
): Promise<void> {
  const spoken = sanitizeForSpeech(text);
  if (!spoken) return;

  if (tts?.audioBase64) {
    try {
      const { playBase64Audio } = await import("./voice-client");
      await playBase64Audio(tts.audioBase64);
      return;
    } catch {
      // fall through to natural browser speech
    }
  }

  const profile = PANEL_SPEECH_PROFILES[voiceId] || PANEL_SPEECH_PROFILES.professional_en;
  await speakNaturally(spoken, profile);
}

/** Brief moderator intro, pause, then one panelist question — like a real panel. */
export async function speakPanelTurn(opts: {
  moderatorMessage?: string;
  moderatorTts?: { audioBase64: string | null; useBrowserFallback?: boolean };
  question: string;
  voiceId: string;
  tts?: { audioBase64: string | null; useBrowserFallback?: boolean };
}): Promise<void> {
  if (opts.moderatorMessage?.trim()) {
    await speakPanelText(opts.moderatorMessage, "professional_en", opts.moderatorTts);
    await pause(800);
  }
  await speakPanelText(opts.question, opts.voiceId, opts.tts);
}
