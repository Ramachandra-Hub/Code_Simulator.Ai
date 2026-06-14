export interface StandupInput {
  yesterday: string;
  today: string;
  blockers?: string;
}

export interface StandupEvaluation {
  communicationScore: number;
  ownershipScore: number;
  professionalismScore: number;
  feedback: string;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function hasMetrics(s: string): boolean {
  return /\d+%|\d+\s*(hours?|hrs|tasks?|prs?|bugs?|tickets?)/i.test(s);
}

export function evaluateStandup(input: StandupInput): StandupEvaluation {
  const yWords = wordCount(input.yesterday);
  const tWords = wordCount(input.today);
  const blockerText = (input.blockers || "").trim();

  let communication = 55;
  if (yWords >= 12 && tWords >= 10) communication += 15;
  if (hasMetrics(input.yesterday) || hasMetrics(input.today)) communication += 10;
  if (yWords < 5 || tWords < 5) communication -= 15;

  let ownership = 50;
  if (/\b(shipped|delivered|merged|fixed|completed|closed)\b/i.test(input.yesterday)) ownership += 20;
  if (/\b(own|led|drove|unblocked)\b/i.test(input.yesterday + input.today)) ownership += 10;
  if (/\b(stuck|waiting|not sure)\b/i.test(input.today) && !blockerText) ownership -= 10;

  let professionalism = 58;
  if (blockerText.length > 10) professionalism += 12;
  if (/\b(help|support|escalat)/i.test(blockerText)) professionalism += 8;
  if (/\b(nothing|idk|whatever)\b/i.test(input.yesterday + input.today)) professionalism -= 20;

  communication = Math.max(0, Math.min(100, communication));
  ownership = Math.max(0, Math.min(100, ownership));
  professionalism = Math.max(0, Math.min(100, professionalism));

  const avg = Math.round((communication + ownership + professionalism) / 3);
  const tips: string[] = [];
  if (communication < 70) tips.push("Add concrete outcomes and metrics to yesterday's update.");
  if (ownership < 70) tips.push("Highlight what you personally delivered and what's next.");
  if (professionalism < 70) tips.push("Call out blockers early with a clear ask.");
  const feedback =
    tips.length > 0
      ? `Standup scored ${avg}/100. ${tips.join(" ")}`
      : `Strong standup (${avg}/100). Clear updates, ownership, and professional tone.`;

  return {
    communicationScore: communication,
    ownershipScore: ownership,
    professionalismScore: professionalism,
    feedback,
  };
}
