import { detectContextReference } from "@/lib/interview-immersion";

export interface RealismInput {
  followUpCount?: number;
  interruptionCount?: number;
  contextReferenceCount?: number;
  turnCount?: number;
  recentQuestions?: string[];
}

export function countContextReferences(questions: string[]): number {
  return questions.filter((q) => detectContextReference(q)).length;
}

/** Internal realism score — higher when panel behaves like real humans. */
export function computeInterviewRealismScore(input: RealismInput): number {
  const followUps = input.followUpCount ?? 0;
  const interruptions = input.interruptionCount ?? 0;
  const contextRefs =
    input.contextReferenceCount ?? countContextReferences(input.recentQuestions || []);
  const turns = input.turnCount ?? 0;

  const base = Math.min(35, turns * 6);
  const follow = Math.min(25, followUps * 12);
  const context = Math.min(25, contextRefs * 15);
  const interrupt = Math.min(15, interruptions * 6);

  return Math.round(Math.min(100, base + follow + context + interrupt));
}

export function extractEarlierAnswerSnippet(
  transcript: Array<{ speaker: string; text: string; role: string }>
): string | null {
  const studentLines = transcript.filter((t) => t.role === "student" || t.speaker === "You");
  for (let i = studentLines.length - 1; i >= 0; i--) {
    const text = studentLines[i].text;
    const project = text.match(
      /\b((?:CNN|machine learning|deep learning|NLP|React|microservices)[^.!?]{0,60}|(?:built|developed|implemented|designed)\s+[^.!?]{10,80})/i
    );
    if (project) return project[0].trim();
    if (text.length > 40) return text.slice(0, 120).trim() + (text.length > 120 ? "…" : "");
  }
  return null;
}
