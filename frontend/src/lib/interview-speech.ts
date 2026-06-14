/** Browser TTS for AI interviewer questions — natural neural voices when available. */

import {
  isNaturalSpeechActive,
  isNaturalSpeechSupported,
  speakNaturally,
  stopNaturalSpeech,
  type NaturalSpeechProfile,
} from "./natural-speech";

const INTERVIEW_PROFILES: Record<string, NaturalSpeechProfile> = {
  professional: { pitch: 1.0, rate: 0.9, gender: "neutral", lang: "en-US" },
  female: { pitch: 1.05, rate: 0.9, gender: "female", lang: "en-US" },
  male: { pitch: 0.9, rate: 0.88, gender: "male", lang: "en-US" },
};

export function isTtsSupported(): boolean {
  return isNaturalSpeechSupported();
}

export function stopSpeaking(): void {
  stopNaturalSpeech();
}

export function speakText(text: string, onEnd?: () => void, voiceProfile = "professional"): void {
  if (!isTtsSupported() || !text.trim()) {
    onEnd?.();
    return;
  }
  const profile = INTERVIEW_PROFILES[voiceProfile] || INTERVIEW_PROFILES.professional;
  void speakNaturally(text, profile, onEnd);
}

export function isSpeaking(): boolean {
  return isNaturalSpeechActive();
}
