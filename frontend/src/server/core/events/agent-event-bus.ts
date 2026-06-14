import { prisma } from "../db/prisma";

export type AgentEventType =
  | "interview.completed"
  | "resume.updated"
  | "assignment.submitted"
  | "exam.completed"
  | "coding.submitted"
  | "coding.interview.completed"
  | "github.synced"
  | "linkedin.synced"
  | "leetcode.synced"
  | "hackerrank.synced"
  | "panel.completed"
  | "digitaltwin.update"
  | "analytics.recompute"
  | "placement.recompute";

type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

class AgentEventBus {
  private handlers = new Map<AgentEventType, EventHandler[]>();
  private queue: Array<{ type: AgentEventType; payload: Record<string, unknown> }> = [];
  private processing = false;

  on(type: AgentEventType, handler: EventHandler): void {
    const list = this.handlers.get(type) || [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  async emit(type: AgentEventType, payload: Record<string, unknown> = {}): Promise<void> {
    await prisma.agentEvent.create({
      data: { type, payload: payload as object },
    }).catch(() => {});

    this.queue.push({ type, payload });
    if (!this.processing) await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      const handlers = this.handlers.get(event.type) || [];
      for (const handler of handlers) {
        try {
          await handler(event.payload);
        } catch (err) {
          console.error(`Event handler failed for ${event.type}:`, err);
        }
      }
    }
    this.processing = false;
  }
}

export const agentEventBus = new AgentEventBus();
