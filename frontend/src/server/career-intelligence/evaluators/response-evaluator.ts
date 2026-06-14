const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "actually", "sort of", "kind of"];

export type AnswerType =
  | "strong"
  | "weak"
  | "partial"
  | "irrelevant"
  | "team_ownership"
  | "lack_of_knowledge"
  | "confidence_issue"
  | "communication_issue";

export interface ResponseEvaluation {
  answerType: AnswerType;
  confidence: number;
  scores: {
    relevance: number;
    depth: number;
    communication: number;
    confidence: number;
    overall: number;
  };
  signals: string[];
  followUp?: string;
  feedback: string;
  keywordsMatched: string[];
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countFillers(text: string): number {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce((acc, w) => acc + (lower.split(w).length - 1), 0);
}

function hasSTAR(text: string): boolean {
  const lower = text.toLowerCase();
  const signals = ["situation", "task", "action", "result", "when i", "i led", "i implemented", "the outcome"];
  return signals.filter((s) => lower.includes(s)).length >= 2;
}

export function evaluateResponse(
  question: string,
  answer: string,
  keywords: string[] = [],
  interviewType = "technical"
): ResponseEvaluation {
  const words = countWords(answer);
  const fillers = countFillers(answer);
  const lower = answer.toLowerCase();
  const matched = keywords.filter((k) => lower.includes(k.toLowerCase()));

  let relevance = 40;
  if (words >= 30) relevance += 20;
  if (words >= 60) relevance += 15;
  if (matched.length >= 2) relevance += 15;
  if (matched.length >= 4) relevance += 10;
  relevance = Math.min(100, relevance);

  let depth = 35;
  if (words >= 50) depth += 20;
  if (words >= 100) depth += 15;
  if (interviewType === "behavioral" && hasSTAR(answer)) depth += 25;
  if (interviewType === "technical" && matched.length >= 3) depth += 20;
  if (interviewType === "coding" && /o\(|complexity|algorithm/i.test(answer)) depth += 20;
  if (interviewType === "system_design" && /scale|database|cache|api/i.test(answer)) depth += 20;
  depth = Math.min(100, depth);

  let communication = 50;
  if (words >= 20 && words <= 200) communication += 20;
  if (fillers <= 2) communication += 15;
  else if (fillers > 5) communication -= 10;
  communication = Math.max(0, Math.min(100, communication));

  let confidence = 45;
  if (words >= 40) confidence += 20;
  if (!/^(i don't know|not sure|maybe|i guess)/i.test(answer.trim())) confidence += 15;
  if (/\b(i built|i developed|i led|i designed|i implemented)\b/i.test(answer)) confidence += 15;
  confidence = Math.min(100, confidence);

  const overall = Math.round(relevance * 0.3 + depth * 0.3 + communication * 0.2 + confidence * 0.2);

  const signals: string[] = [];
  let answerType: AnswerType = "partial";
  let followUp: string | undefined;

  if (overall >= 80) answerType = "strong";
  else if (overall < 40) answerType = "weak";
  else if (words < 15) answerType = "partial";

  if (/team project|we did|our team|group project/i.test(answer) && !/\b(i built|i wrote|i designed|my part|i was responsible)\b/i.test(answer)) {
    answerType = "team_ownership";
    followUp = "That sounds like a team effort. What was YOUR specific contribution? What did you personally build, design, or decide?";
    signals.push("team_ownership_detected");
  }

  if (/i don't know|not sure|no idea|haven't worked/i.test(answer)) {
    answerType = "lack_of_knowledge";
    followUp = "That's okay. Can you think of a related concept or a simpler problem you've solved that's similar?";
    signals.push("knowledge_gap");
  }

  if (fillers > 5 || words < 20) {
    if (answerType === "partial") answerType = "communication_issue";
    signals.push("communication_needs_work");
  }

  if (/^(um|uh|like)/i.test(answer) && confidence < 50) {
    answerType = "confidence_issue";
    signals.push("confidence_low");
  }

  if (relevance < 30) answerType = "irrelevant";

  const feedbackParts: string[] = [];
  if (words < 30) feedbackParts.push("Expand with specific details and examples.");
  if (matched.length < 2) feedbackParts.push("Reference more skills from your resume.");
  if (fillers > 4) feedbackParts.push("Reduce filler words for clearer communication.");
  if (overall >= 80) feedbackParts.push("Strong answer with good depth.");
  else if (overall >= 60) feedbackParts.push("Good foundation — add quantifiable outcomes.");

  return {
    answerType,
    confidence: overall / 100,
    scores: { relevance, depth, communication, confidence, overall },
    signals,
    followUp,
    feedback: feedbackParts.join(" "),
    keywordsMatched: matched,
  };
}
