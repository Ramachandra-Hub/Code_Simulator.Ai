/** Natural-sounding browser TTS — prefers neural voices with human pacing. */

import { sanitizeForSpeech } from "./speech-sanitize";

export interface NaturalSpeechProfile {
  pitch?: number;
  rate?: number;
  gender?: "male" | "female" | "neutral";
  lang?: string;
}

const NATURAL_VOICE_HINTS = [
  "natural",
  "neural",
  "online",
  "premium",
  "enhanced",
  "aria",
  "jenny",
  "guy",
  "sonia",
  "ryan",
  "sara",
];

const FEMALE_HINTS = ["female", "aria", "jenny", "sonia", "sara", "zira", "samantha", "karen", "moira"];
const MALE_HINTS = ["male", "guy", "ryan", "david", "mark", "james", "daniel", "george"];

let voicesReady: SpeechSynthesisVoice[] | null = null;
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function isNaturalSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function scoreVoice(voice: SpeechSynthesisVoice, profile: NaturalSpeechProfile): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  if (voice.localService) score += 1;
  if (NATURAL_VOICE_HINTS.some((h) => name.includes(h))) score += 12;
  if (name.includes("google")) score += 6;
  if (name.includes("microsoft")) score += 8;

  const lang = profile.lang || "en";
  if (voice.lang.toLowerCase().startsWith(lang.toLowerCase())) score += 5;
  if (voice.lang.toLowerCase().startsWith("en")) score += 3;

  if (profile.gender === "female" && FEMALE_HINTS.some((h) => name.includes(h))) score += 10;
  if (profile.gender === "male" && MALE_HINTS.some((h) => name.includes(h))) score += 10;

  if (name.includes("robotic") || name.includes("espeak")) score -= 20;

  return score;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  if (voicesReady?.length) return Promise.resolve(voicesReady);
  if (voicesPromise) return voicesPromise;

  voicesPromise = new Promise((resolve) => {
    const pick = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length) {
        voicesReady = list;
        resolve(list);
        return true;
      }
      return false;
    };

    if (pick()) return;

    const onVoices = () => {
      if (pick()) window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    window.setTimeout(() => {
      pick();
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      resolve(voicesReady || []);
    }, 500);
  });

  return voicesPromise;
}

export async function pickNaturalVoice(profile: NaturalSpeechProfile = {}): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  if (!voices.length) return null;
  const sorted = [...voices].sort((a, b) => scoreVoice(b, profile) - scoreVoice(a, profile));
  return sorted[0] || null;
}

function splitForSpeech(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const parts = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
  const chunks: string[] = [];
  let buffer = "";

  for (const part of parts) {
    const next = buffer ? `${buffer} ${part.trim()}` : part.trim();
    if (next.length > 140 && buffer) {
      chunks.push(buffer.trim());
      buffer = part.trim();
    } else {
      buffer = next;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.length ? chunks : [cleaned];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

let speaking = false;

export function stopNaturalSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  speaking = false;
}

export function isNaturalSpeechActive(): boolean {
  return speaking || (typeof window !== "undefined" && !!window.speechSynthesis?.speaking);
}

export async function speakNaturally(
  text: string,
  profile: NaturalSpeechProfile = {},
  onEnd?: () => void
): Promise<void> {
  if (!isNaturalSpeechSupported() || !text.trim()) {
    onEnd?.();
    return;
  }

  const spokenText = sanitizeForSpeech(text);
  if (!spokenText) {
    onEnd?.();
    return;
  }

  stopNaturalSpeech();
  const voice = await pickNaturalVoice(profile);
  const chunks = splitForSpeech(spokenText);
  speaking = true;

  for (let i = 0; i < chunks.length; i++) {
    if (!speaking) break;

    const chunk = chunks[i];
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = profile.lang || "en-US";
      utterance.rate = profile.rate ?? 0.9;
      utterance.pitch = (profile.pitch ?? 1) + (i % 2 === 0 ? 0 : 0.02);
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });

    if (i < chunks.length - 1 && speaking) {
      await delay(280 + Math.min(120, chunks[i].length));
    }
  }

  speaking = false;
  onEnd?.();
}

export const PANEL_SPEECH_PROFILES: Record<string, NaturalSpeechProfile> = {
  panel_hr_female: { pitch: 1.05, rate: 0.9, gender: "female" },
  panel_tech_lead: { pitch: 1.0, rate: 0.88, gender: "female" },
  panel_em_male: { pitch: 0.92, rate: 0.87, gender: "male" },
  panel_director_female: { pitch: 0.98, rate: 0.86, gender: "female" },
  panel_recruiter_male: { pitch: 0.9, rate: 0.9, gender: "male" },
  professional_en: { pitch: 1.0, rate: 0.9, gender: "neutral" },
  male_en: { pitch: 0.9, rate: 0.88, gender: "male" },
  female_en: { pitch: 1.05, rate: 0.9, gender: "female" },
};
