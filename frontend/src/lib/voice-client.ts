import { apiFetch } from "./api-client";
import { isTtsSupported, speakText, stopSpeaking } from "./interview-speech";
import { sanitizeForSpeech } from "./speech-sanitize";

export type VoiceProfile = "male" | "female" | "professional";

export interface VoiceStartResult {
  voiceSessionId: string;
  interviewSessionId: string;
  interviewType: string;
  voiceProfile: string;
  firstQuestion: string;
  progress: { questionIndex: number; maxQuestions: number; followUpCount: number; difficulty: string };
  tts: { audioBase64: string | null; source: string; useBrowserFallback: boolean };
  sttAvailable: boolean;
}

export async function startVoiceInterview(input: {
  type: string;
  resumeId?: string;
  voiceProfile?: VoiceProfile;
}) {
  return apiFetch<VoiceStartResult>("/voice/start", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function stopVoiceInterview(voiceSessionId: string) {
  return apiFetch("/voice/stop", {
    method: "POST",
    body: JSON.stringify({ voiceSessionId }),
  });
}

export async function submitVoiceTranscript(input: {
  voiceSessionId: string;
  transcript?: string;
  audioBase64?: string;
  audioDurationMs?: number;
}) {
  return apiFetch<{
    transcript: string;
    evaluation: {
      answerType: string;
      confidence: number;
      scores: { relevance: number; depth: number; communication: number; confidence: number; overall: number };
      feedback: string;
      signals: string[];
    };
    phase: string;
    progress: { questionIndex: number; maxQuestions: number; followUpCount: number; difficulty: string };
    nextQuestion: string | null;
    voiceMetrics: {
      wordsPerMinute: number;
      fillerCount: number;
      pauseCount: number;
      confidenceEstimate: number;
      communicationScore: number;
      clarityScore: number;
      speakingPace: string;
    };
    voiceAnalysis: { summary: string; recommendations: string[] };
    tts: { audioBase64: string | null; source: string; useBrowserFallback: boolean } | null;
  }>("/voice/transcript", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getVoiceMetrics(voiceSessionId: string) {
  return apiFetch(`/voice/metrics?voiceSessionId=${voiceSessionId}`);
}

export async function transcribeAudio(audioBase64: string) {
  return apiFetch<{ text: string; source: string }>("/voice/stt", {
    method: "POST",
    body: JSON.stringify({ audio: audioBase64 }),
  });
}

export function playBase64Audio(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("Audio playback failed"));
      void audio.play();
    } catch (e) {
      reject(e);
    }
  });
}

export async function speakInterviewText(
  text: string,
  tts?: { audioBase64: string | null; useBrowserFallback?: boolean },
  voiceProfile: VoiceProfile | string = "professional"
) {
  stopSpeaking();
  if (tts?.audioBase64) {
    try {
      await playBase64Audio(tts.audioBase64);
      return;
    } catch {
      // fall through to natural browser speech
    }
  }
  if (isTtsSupported()) {
    speakText(sanitizeForSpeech(text), undefined, voiceProfile);
  }
}
