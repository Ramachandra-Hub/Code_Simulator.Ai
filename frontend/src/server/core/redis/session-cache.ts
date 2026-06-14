import { redisDel, redisGet, redisSet } from "./redis-client";
import type { AuthUser } from "../../lib/auth";

const PREFIX = "session:";
const DEFAULT_TTL_SEC = Number(process.env.SESSION_CACHE_TTL_SEC || "604800"); // 7 days

function sessionKey(tokenHash: string): string {
  return PREFIX + tokenHash;
}

export async function cacheSession(tokenHash: string, user: AuthUser): Promise<void> {
  await redisSet(sessionKey(tokenHash), JSON.stringify(user), DEFAULT_TTL_SEC);
}

export async function getCachedSession(tokenHash: string): Promise<AuthUser | null> {
  const raw = await redisGet(sessionKey(tokenHash));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function invalidateSession(tokenHash: string): Promise<void> {
  await redisDel(sessionKey(tokenHash));
}
