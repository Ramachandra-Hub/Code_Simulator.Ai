export interface VelocityWindow {
  days: number;
  skillGrowth: number;
  interviewGrowth: number;
  codingGrowth: number;
  professionalGrowth: number;
}

export interface CareerVelocityResult {
  careerVelocityScore: number;
  windows: VelocityWindow[];
  trend: "accelerating" | "steady" | "slowing";
}

function delta(recent: number, older: number): number {
  if (!older) return recent > 0 ? Math.min(100, recent * 0.5) : 0;
  return Math.round(((recent - older) / Math.max(older, 1)) * 100);
}

export function computeCareerVelocity(opts: {
  snapshots: Array<{ date: Date; placement?: number; coding?: number; interview?: number; professional?: number; technical?: number }>;
}): CareerVelocityResult {
  const now = Date.now();
  const windows: VelocityWindow[] = [30, 60, 90].map((days) => {
    const cutoff = now - days * 86400000;
    const inWindow = opts.snapshots.filter((s) => s.date.getTime() >= cutoff);
    const beforeWindow = opts.snapshots.filter((s) => s.date.getTime() < cutoff);
    const avg = (arr: typeof inWindow, key: keyof (typeof inWindow)[0]) =>
      arr.length ? arr.reduce((s, x) => s + ((x[key] as number) || 0), 0) / arr.length : 0;

    return {
      days,
      skillGrowth: delta(avg(inWindow, "technical"), avg(beforeWindow, "technical")),
      interviewGrowth: delta(avg(inWindow, "interview"), avg(beforeWindow, "interview")),
      codingGrowth: delta(avg(inWindow, "coding"), avg(beforeWindow, "coding")),
      professionalGrowth: delta(avg(inWindow, "professional"), avg(beforeWindow, "professional")),
    };
  });

  const w30 = windows[0];
  const score = Math.round(
    Math.max(0, w30.skillGrowth) * 0.25 +
      Math.max(0, w30.interviewGrowth) * 0.3 +
      Math.max(0, w30.codingGrowth) * 0.25 +
      Math.max(0, w30.professionalGrowth) * 0.2 +
      50
  );

  const trend =
    w30.interviewGrowth + w30.codingGrowth > 20
      ? "accelerating"
      : w30.interviewGrowth + w30.codingGrowth > 0
        ? "steady"
        : "slowing";

  return { careerVelocityScore: Math.min(100, score), windows, trend };
}
