import { getRedis, isRedisConfigured } from "./redis-client";
import type { RateLimitRule } from "../../lib/rate-limit";

/** Redis-backed rate limiting for multi-instance ECS deployments (server-side API routes). */
export async function checkRateLimitRedis(
  ip: string,
  pathname: string,
  rule: RateLimitRule
): Promise<{ allowed: boolean; remaining: number }> {
  if (!isRedisConfigured()) return { allowed: true, remaining: rule.limit };

  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: rule.limit };

  const windowMs = rule.windowMs ?? 60_000;
  const windowSec = Math.ceil(windowMs / 1000);
  const key = `ratelimit:${ip}:${rule.prefix}`;

  try {
    if (redis.status !== "ready") await redis.connect();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    const allowed = count <= rule.limit;
    return { allowed, remaining: Math.max(0, rule.limit - count) };
  } catch {
    return { allowed: true, remaining: rule.limit };
  }
}
