import Redis from "ioredis";

let client: Redis | null = null;
let lastPing: { ok: boolean; latencyMs: number; at: string } | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 3000,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
    });
    client.on("error", () => {
      /* connection errors handled per-call */
    });
  }
  return client;
}

export async function redisHealthCheck(): Promise<{
  configured: boolean;
  available: boolean;
  latencyMs: number;
  persistence: string;
}> {
  const configured = isRedisConfigured();
  if (!configured) {
    return { configured: false, available: false, latencyMs: 0, persistence: "not_configured" };
  }

  const redis = getRedis();
  if (!redis) {
    return { configured: true, available: false, latencyMs: 0, persistence: "unknown" };
  }

  const start = Date.now();
  try {
    if (redis.status !== "ready") await redis.connect();
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;
    let persistence = "unknown";
    try {
      const info = await redis.info("persistence");
      persistence = /aof_enabled:1/.test(info) ? "aof" : /rdb_last_save_time/.test(info) ? "rdb" : "none";
    } catch {
      persistence = "unverified";
    }
    lastPing = { ok: pong === "PONG", latencyMs, at: new Date().toISOString() };
    return { configured: true, available: pong === "PONG", latencyMs, persistence };
  } catch {
    lastPing = { ok: false, latencyMs: Date.now() - start, at: new Date().toISOString() };
    return { configured: true, available: false, latencyMs: Date.now() - start, persistence: "unavailable" };
  }
}

export function getLastRedisPing() {
  return lastPing;
}

export async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    if (redis.status !== "ready") await redis.connect();
    return redis.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSec?: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== "ready") await redis.connect();
    if (ttlSec) await redis.set(key, value, "EX", ttlSec);
    else await redis.set(key, value);
  } catch {
    /* non-blocking */
  }
}

export async function redisDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== "ready") await redis.connect();
    await redis.del(key);
  } catch {
    /* non-blocking */
  }
}
