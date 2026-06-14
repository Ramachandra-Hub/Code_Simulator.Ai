import { analyzeVoiceDelivery, type VoiceAnalysisResult } from "../evaluators/voice-analysis-evaluator";
import { llmComplete } from "../prompts/agent-llm";

export interface VoiceAnalysisAgentInput {
  transcript: string;
  audioDurationMs?: number;
  answerConfidence?: number;
  communicationScore?: number;
  interviewType?: string;
}

export interface VoiceAnalysisAgentOutput extends VoiceAnalysisResult {
  summary: string;
  recommendations: string[];
  source: "heuristic" | "heuristic+llm";
}

export async function runVoiceAnalysisAgent(
  input: VoiceAnalysisAgentInput
): Promise<VoiceAnalysisAgentOutput> {
  const heuristic = analyzeVoiceDelivery({
    transcript: input.transcript,
    audioDurationMs: input.audioDurationMs,
    answerConfidence: input.answerConfidence,
    communicationScore: input.communicationScore,
  });

  const recommendations: string[] = [];
  if (heuristic.fillerCount >= 3) recommendations.push("Reduce filler words — pause briefly instead of saying 'um' or 'like'");
  if (heuristic.speakingPace === "fast") recommendations.push("Slow down slightly for clearer delivery");
  if (heuristic.speakingPace === "slow") recommendations.push("Pick up pace slightly to maintain interviewer engagement");
  if (heuristic.clarityScore < 65) recommendations.push("Structure answers: context → action → result");
  if (heuristic.confidenceEstimate < 60) recommendations.push("Practice speaking answers aloud before interviews");

  let summary = `Pace: ${heuristic.wordsPerMinute} WPM (${heuristic.speakingPace}). Fillers: ${heuristic.fillerCount}. Clarity: ${heuristic.clarityScore}/100.`;
  let source: "heuristic" | "heuristic+llm" = "heuristic";

  if (input.transcript.length > 40) {
    try {
      const llm = await llmComplete(
        "You analyze spoken interview answers. Be concise.",
        `Summarize voice delivery in 1-2 sentences for a ${input.interviewType || "technical"} interview.
Transcript: "${input.transcript.slice(0, 800)}"
WPM: ${heuristic.wordsPerMinute}, fillers: ${heuristic.fillerCount}, clarity: ${heuristic.clarityScore}`,
        { maxTokens: 120, temperature: 0.4 }
      );
      if (llm.trim()) {
        summary = llm.trim();
        source = "heuristic+llm";
      }
    } catch {
      // keep heuristic summary
    }
  }

  return {
    ...heuristic,
    summary,
    recommendations: recommendations.length ? recommendations : ["Continue practicing voice mock interviews"],
    source,
  };
}
