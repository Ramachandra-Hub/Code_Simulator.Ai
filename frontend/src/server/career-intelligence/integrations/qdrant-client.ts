import { QdrantClient as Qdrant } from "@qdrant/js-client-rest";
import { embedText, embeddingDimension } from "../../core/embeddings/embedding-service";

export const COLLECTIONS = {
  semanticMemory: (userId: string) => `user_${userId}`,
  talentSearch: "talent_candidates",
  questionBank: "interview_questions",
} as const;

class QdrantClientWrapper {
  private client: Qdrant | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.QDRANT_URL);
  }

  private getClient(): Qdrant | null {
    if (!process.env.QDRANT_URL) return null;
    if (!this.client) {
      this.client = new Qdrant({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
      });
    }
    return this.client;
  }

  async healthCheck(): Promise<{ configured: boolean; available: boolean; collections: number }> {
    const configured = this.isConfigured();
    if (!configured) return { configured: false, available: false, collections: 0 };
    const client = this.getClient();
    if (!client) return { configured: true, available: false, collections: 0 };
    try {
      const cols = await client.getCollections();
      return { configured: true, available: true, collections: cols.collections.length };
    } catch {
      return { configured: true, available: false, collections: 0 };
    }
  }

  private async ensureCollection(collection: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;
    const collections = await client.getCollections();
    if (!collections.collections.find((c) => c.name === collection)) {
      await client.createCollection(collection, {
        vectors: { size: embeddingDimension(), distance: "Cosine" },
      });
    }
  }

  async upsert(collection: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await this.ensureCollection(collection);
      const { vector } = await embedText(content);
      const id = Date.now() + Math.floor(Math.random() * 1000);
      await client.upsert(collection, {
        points: [{ id, vector, payload: { content, ...metadata, indexedAt: new Date().toISOString() } }],
      });
    } catch (err) {
      console.warn(JSON.stringify({ level: "warn", service: "qdrant", event: "upsert_failed", error: String(err) }));
    }
  }

  async search(collection: string, query: string, limit = 5, filter?: Record<string, unknown>): Promise<Array<{ content: string; score: number; metadata: Record<string, unknown> }>> {
    const client = this.getClient();
    if (!client) return [];

    try {
      await this.ensureCollection(collection);
      const { vector } = await embedText(query);
      const results = await client.search(collection, {
        vector,
        limit,
        filter: filter as never,
      });
      return results.map((r) => ({
        content: (r.payload?.content as string) || "",
        score: r.score,
        metadata: (r.payload as Record<string, unknown>) || {},
      }));
    } catch {
      return [];
    }
  }

  async searchTalent(query: string, limit = 10): Promise<Array<{ content: string; score: number; metadata: Record<string, unknown> }>> {
    return this.search(COLLECTIONS.talentSearch, query, limit);
  }

  async searchQuestions(topic: string, limit = 5): Promise<string[]> {
    const results = await this.search(COLLECTIONS.questionBank, topic, limit);
    return results.map((r) => r.content).filter(Boolean);
  }
}

export const qdrantClient = new QdrantClientWrapper();
