import { prisma } from "../db/prisma";
import { qdrantClient } from "../../career-intelligence/integrations/qdrant-client";

interface MemoryEntry {
  key: string;
  value: unknown;
  expiresAt?: number;
}

class WorkingMemory {
  private store = new Map<string, Map<string, MemoryEntry>>();

  set(userId: string, key: string, value: unknown, ttlMs = 3600000): void {
    if (!this.store.has(userId)) this.store.set(userId, new Map());
    this.store.get(userId)!.set(key, { key, value, expiresAt: Date.now() + ttlMs });
  }

  get(userId: string, key: string): unknown {
    const entry = this.store.get(userId)?.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.get(userId)?.delete(key);
      return undefined;
    }
    return entry.value;
  }
}

class AgentMemory {
  private working = new WorkingMemory();

  async remember(userId: string, key: string, value: unknown): Promise<void> {
    this.working.set(userId, key, value);

    const profile = await prisma.studentIntelligenceProfile.findUnique({
      where: { userId },
    });
    if (profile) {
      await prisma.memoryRecord.create({
        data: {
          profileId: profile.id,
          type: "episodic",
          content: JSON.stringify({ key, value }),
        },
      });
    }
  }

  async recall(userId: string, key: string): Promise<unknown> {
    const working = this.working.get(userId, key);
    if (working !== undefined) return working;

    const profile = await prisma.studentIntelligenceProfile.findUnique({
      where: { userId },
      include: { memoryRecords: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
    if (!profile) return undefined;

    for (const record of profile.memoryRecords) {
      try {
        const parsed = JSON.parse(record.content) as { key: string; value: unknown };
        if (parsed.key === key) return parsed.value;
      } catch { /* skip */ }
    }
    return undefined;
  }

  async semanticSearch(userId: string, query: string, limit = 5): Promise<string[]> {
    const results = await qdrantClient.search(`user_${userId}`, query, limit);
    return results.map((r) => r.content).filter(Boolean);
  }

  async storeSemantic(userId: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
    await qdrantClient.upsert(`user_${userId}`, content, metadata);
  }
}

export const agentMemory = new AgentMemory();
