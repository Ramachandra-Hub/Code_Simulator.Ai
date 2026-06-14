/** Plain text for TTS — words and numbers only, no markdown or symbols. */

/** Strip markdown/symbols so TTS reads only words and numbers. */
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[<>[\]{}|\\~^]/g, " ")
    .replace(/[#*_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keep a single interview question — one speaker, one ask, then wait for the candidate. */
export function extractSingleQuestion(text: string): string {
  let cleaned = sanitizeForSpeech(text);
  if (!cleaned) return "";

  const firstSentenceWithQuestion = cleaned.match(/^[\s\S]*?\?/);
  if (firstSentenceWithQuestion) {
    cleaned = firstSentenceWithQuestion[0].trim();
  } else {
    const lines = cleaned
      .split(/(?<=[.!?])\s+|\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 1) cleaned = lines[0];
  }

  const andSplit = cleaned.split(/\s+and\s+(?:also\s+)?(?:can you|could you|what|how|why|tell me)/i);
  if (andSplit.length > 1 && andSplit[0].length > 20) {
    cleaned = andSplit[0].trim();
    if (!cleaned.endsWith("?")) cleaned += "?";
  }

  if (cleaned.length > 240) {
    const cut = cleaned.slice(0, 240);
    const lastSpace = cut.lastIndexOf(" ");
    cleaned = (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim();
    if (!cleaned.endsWith("?") && !cleaned.endsWith(".")) cleaned += "?";
  }

  return cleaned;
}

export function normalizePanelQuestion(text: string): string {
  return extractSingleQuestion(text);
}
