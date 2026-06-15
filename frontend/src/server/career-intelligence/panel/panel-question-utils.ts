/** Detect when generated text is mostly echoing the candidate's answer. */
export function isEchoOfAnswer(question: string, answer: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const q = norm(question);
  const a = norm(answer);
  if (!q || !a || q.length < 12) return false;

  if (a.length >= 24 && q.includes(a.slice(0, Math.min(50, a.length)))) return true;
  if (q.length >= 24 && a.includes(q.slice(0, Math.min(50, q.length)))) return true;

  const qWords = new Set(q.split(" ").filter((w) => w.length > 3));
  const aWords = a.split(" ").filter((w) => w.length > 3);
  if (qWords.size === 0 || aWords.length === 0) return false;

  let overlap = 0;
  for (const w of aWords) {
    if (qWords.has(w)) overlap++;
  }
  const ratio = overlap / Math.max(qWords.size, aWords.length);
  return ratio > 0.55;
}

export function pickFromPool(pool: string[], asked: Set<string>): string | null {
  const available = pool.filter((q) => !asked.has(q));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}
