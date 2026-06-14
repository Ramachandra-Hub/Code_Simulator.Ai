const FILLER_PATTERN = /\b(um|uh|uhm|erm|like|you know|sort of|kind of|basically|actually)\b/gi;
const PAUSE_PATTERN = /(\.\.\.|—|--|\[pause\])/gi;

export interface VoiceAnalysisInput {
  transcript: string;
  audioDurationMs?: number;
  answerConfidence?: number;
  communicationScore?: number;
}

export interface VoiceAnalysisResult {
  wordsPerMinute: number;
  fillerCount: number;
  pauseCount: number;
  confidenceEstimate: number;
  communicationScore: number;
  clarityScore: number;
  speakingPace: "slow" | "normal" | "fast";
  fillers: string[];
  signals: string[];
}

export function analyzeVoiceDelivery(input: VoiceAnalysisInput): VoiceAnalysisResult {
  const text = input.transcript.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const durationMin = Math.max((input.audioDurationMs || wordCount * 400) / 60000, 0.1);
  const wpm = Math.round(wordCount / durationMin);

  const fillerMatches = text.match(FILLER_PATTERN) || [];
  const fillerCount = fillerMatches.length;
  const pauseCount = (text.match(PAUSE_PATTERN) || []).length;

  let speakingPace: "slow" | "normal" | "fast" = "normal";
  if (wpm < 100) speakingPace = "slow";
  else if (wpm > 160) speakingPace = "fast";

  const signals: string[] = [];
  if (fillerCount >= 5) signals.push("high_filler_usage");
  if (fillerCount >= 2) signals.push("filler_words");
  if (pauseCount >= 2) signals.push("hesitation_pauses");
  if (wpm < 90) signals.push("slow_pace");
  if (wpm > 170) signals.push("rushed_pace");
  if (wordCount < 15) signals.push("brief_answer");

  const fillerPenalty = Math.min(30, fillerCount * 4);
  const pausePenalty = Math.min(15, pauseCount * 5);
  const pacePenalty = speakingPace === "fast" ? 8 : speakingPace === "slow" ? 5 : 0;
  const lengthPenalty = wordCount < 10 ? 15 : wordCount < 20 ? 5 : 0;

  const baseComm = input.communicationScore ?? 70;
  const communicationScore = Math.max(0, Math.min(100, Math.round(baseComm - fillerPenalty * 0.3 - pausePenalty)));

  const clarityBase = Math.max(40, 100 - fillerPenalty - pausePenalty - lengthPenalty);
  const clarityScore = Math.max(0, Math.min(100, clarityBase));

  const answerConf = input.answerConfidence ?? 65;
  const confidenceEstimate = Math.max(
    0,
    Math.min(100, Math.round(answerConf * 0.6 + communicationScore * 0.25 + clarityScore * 0.15 - fillerPenalty * 0.5))
  );

  return {
    wordsPerMinute: wpm,
    fillerCount,
    pauseCount,
    confidenceEstimate,
    communicationScore,
    clarityScore,
    speakingPace,
    fillers: Array.from(new Set(fillerMatches.map((f) => f.toLowerCase()))),
    signals,
  };
}
