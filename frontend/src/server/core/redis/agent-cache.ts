import { createHash } from "crypto";
import { redisGet, redisSet } from "./redis-client";

const PREFIX = "agent:cache:";
const DEFAULT_TTL_SEC = Number(process.env.AGENT_CACHE_TTL_SEC || "3600");

function cacheKey(agentId: string, input: unknown, userId?: string): string {
  const raw = JSON.stringify({ agentId, userId, input });
  return PREFIX + createHash("sha256").update(raw).digest("hex");
}

export async function getAgentCache<T>(agentId: string, input: unknown, userId?: string): Promise<T | null> {
  const key = cacheKey(agentId, input, userId);
  const raw = await redisGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setAgentCache(agentId: string, input: unknown, output: unknown, userId?: string, ttlSec = DEFAULT_TTL_SEC): Promise<void> {
  const key = cacheKey(agentId, input, userId);
  await redisSet(key, JSON.stringify(output), ttlSec);
}
