import type { VoiceProfile } from "../../core/voice/adapters/tts-adapter";
import { ttsAdapter } from "../../core/voice/adapters/tts-adapter";
import { whisperAdapter } from "../../core/voice/adapters/whisper-adapter";

export interface VoiceTurnState {
  recording: boolean;
  awaitingAnswer: boolean;
  currentQuestion: string | null;
  voiceProfile: VoiceProfile | string;
}

export interface VoiceInterviewAgentResult {
  transcript: string;
  sttSource: string;
  ttsAudioBase64: string | null;
  ttsSource: string;
  state: VoiceTurnState;
}

/** Coordinates STT/TTS and turn-taking for voice interviews */
export class VoiceInterviewAgent {
  async transcribeAudio(audioBase64: string): Promise<{ text: string; source: string }> {
    const result = await whisperAdapter.transcribe(audioBase64);
    return { text: result.text, source: result.source };
  }

  async speakQuestion(question: string, voiceProfile: VoiceProfile | string): Promise<{
    audioBase64: string | null;
    source: string;
    useBrowserFallback: boolean;
  }> {
    const tts = await ttsAdapter.synthesize(question, voiceProfile as VoiceProfile);
    return {
      audioBase64: tts.audioBase64,
      source: tts.source,
      useBrowserFallback: tts.source === "browser_fallback",
    };
  }

  buildTurnState(opts: {
    recording: boolean;
    currentQuestion: string | null;
    voiceProfile: VoiceProfile | string;
    phase: string;
  }): VoiceTurnState {
    return {
      recording: opts.recording,
      awaitingAnswer: opts.phase === "answering" && !opts.recording,
      currentQuestion: opts.currentQuestion,
      voiceProfile: opts.voiceProfile,
    };
  }
}

export const voiceInterviewAgent = new VoiceInterviewAgent();
