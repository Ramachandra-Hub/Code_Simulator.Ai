import { pickThinkingMessage } from "./interview-personas";

/** Natural 1–3s pause before interviewer responds. */
export function immersionThinkingDelay(minMs = 1000, maxMs = 3000): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function detectContextReference(text: string): boolean {
  return /\b(earlier you|you mentioned|you said|as you noted|regarding your|your .{3,40} project|in your previous|building on what)\b/i.test(
    text
  );
}

export interface RealismMetrics {
  interruptions: number;
  followUps: number;
  contextReferences: number;
  turnCount: number;
}

export class InterviewRealismTracker {
  interruptions = 0;
  followUps = 0;
  contextReferences = 0;
  turnCount = 0;

  recordTurn() {
    this.turnCount += 1;
  }

  recordInterruption() {
    this.interruptions += 1;
  }

  recordFollowUp() {
    this.followUps += 1;
  }

  recordQuestion(text: string) {
    if (detectContextReference(text)) this.contextReferences += 1;
    if (/\?/.test(text) && this.turnCount > 0) {
      // follow-up style questions often reference prior content
      if (/follow|clarify|specifically|elaborate|expand/i.test(text)) {
        this.followUps += 1;
      }
    }
  }

  merge(server?: Partial<RealismMetrics>) {
    if (!server) return;
    this.interruptions = Math.max(this.interruptions, server.interruptions ?? 0);
    this.followUps = Math.max(this.followUps, server.followUps ?? 0);
    this.contextReferences = Math.max(this.contextReferences, server.contextReferences ?? 0);
    this.turnCount = Math.max(this.turnCount, server.turnCount ?? 0);
  }

  getMetrics(): RealismMetrics {
    return {
      interruptions: this.interruptions,
      followUps: this.followUps,
      contextReferences: this.contextReferences,
      turnCount: this.turnCount,
    };
  }

  getScore(): number {
    const m = this.getMetrics();
    const base = Math.min(40, m.turnCount * 8);
    const follow = Math.min(25, m.followUps * 12);
    const context = Math.min(25, m.contextReferences * 15);
    const interrupt = Math.min(10, m.interruptions * 5);
    return Math.round(Math.min(100, base + follow + context + interrupt));
  }
}

export async function withThinkingPause(
  onStatus: (msg: string) => void,
  fn: () => Promise<void>
): Promise<void> {
  onStatus(pickThinkingMessage());
  await immersionThinkingDelay();
  await fn();
}
