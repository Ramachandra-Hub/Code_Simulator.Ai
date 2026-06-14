import { Queue, Worker, type Job } from "bullmq";
import { getRedis, isRedisConfigured } from "./redis-client";

const QUEUE_NAMES = ["agent-jobs", "interview-jobs", "talent-jobs"] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

const queues = new Map<QueueName, Queue>();

function connectionOpts() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return { url, maxRetriesPerRequest: null as null };
}

export function getQueue(name: QueueName): Queue | null {
  if (!isRedisConfigured()) return null;
  if (!queues.has(name)) {
    const conn = connectionOpts();
    if (!conn) return null;
    queues.set(name, new Queue(name, { connection: conn }));
  }
  return queues.get(name) || null;
}

export async function enqueueJob<T extends Record<string, unknown>>(
  queueName: QueueName,
  jobName: string,
  data: T,
  opts?: { delay?: number; attempts?: number }
): Promise<string | null> {
  const queue = getQueue(queueName);
  if (!queue) return null;
  const job = await queue.add(jobName, data, {
    attempts: opts?.attempts ?? 3,
    delay: opts?.delay,
    removeOnComplete: 100,
    removeOnFail: 200,
  });
  return job.id || null;
}

export async function getQueueStats(): Promise<Record<string, { waiting: number; active: number; failed: number }>> {
  const empty = Object.fromEntries(QUEUE_NAMES.map((n) => [n, { waiting: 0, active: 0, failed: 0 }]));
  if (!isRedisConfigured()) return empty;

  const { redisHealthCheck } = await import("./redis-client");
  const health = await redisHealthCheck();
  if (!health.available) return empty;

  const stats: Record<string, { waiting: number; active: number; failed: number }> = { ...empty };
  for (const name of QUEUE_NAMES) {
    const queue = getQueue(name);
    if (!queue) continue;
    try {
      const [waiting, active, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getFailedCount(),
      ]);
      stats[name] = { waiting, active, failed };
    } catch {
      stats[name] = { waiting: 0, active: 0, failed: 0 };
    }
  }
  return stats;
}

/** Register a worker processor (call from dedicated worker process in production) */
export function registerWorker<T>(
  queueName: QueueName,
  processor: (job: Job<T>) => Promise<void>
): Worker | null {
  const conn = connectionOpts();
  if (!conn) return null;
  return new Worker(queueName, async (job) => processor(job as Job<T>), { connection: conn });
}
