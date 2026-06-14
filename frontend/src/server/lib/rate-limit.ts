/** In-memory per-IP rate limiting for API routes (single-instance deployments). */

export interface RateLimitRule {
  /** Path prefix or exact path to match */
  prefix: string;
  /** Max requests per window */
  limit: number;
  /** Window duration in ms (default 60s) */
  windowMs?: number;
  /** Optional finer-grained match */
  match?: (pathname: string) => boolean;
}

export const RATE_LIMIT_RULES: RateLimitRule[] = [
  { prefix: "/api/interviews", match: (p) => p.includes("/pdf"), limit: 10, windowMs: 60_000 },
  { prefix: "/api/interviews", limit: 30, windowMs: 60_000 },
  { prefix: "/api/career/coach", limit: 10, windowMs: 60_000 },
  { prefix: "/api/feedback", limit: 20, windowMs: 60_000 },
  { prefix: "/api/beta/insights", limit: 15, windowMs: 60_000 },
  { prefix: "/api/agents", limit: 100, windowMs: 60_000 },
  { prefix: "/api/coding", limit: 100, windowMs: 60_000 },
  { prefix: "/api/voice", limit: 100, windowMs: 60_000 },
];

const buckets = new Map<string, { count: number; resetAt: number }>();

function bucketKey(ip: string, rule: RateLimitRule): string {
  return `${ip}::${rule.prefix}`;
}

export function findRateLimitRule(pathname: string): RateLimitRule | null {
  for (const rule of RATE_LIMIT_RULES) {
    if (!pathname.startsWith(rule.prefix)) continue;
    if (rule.match && !rule.match(pathname)) continue;
    return rule;
  }
  return null;
}

export function checkRateLimit(ip: string, pathname: string): { allowed: boolean; rule: RateLimitRule | null } {
  const rule = findRateLimitRule(pathname);
  if (!rule) return { allowed: true, rule: null };

  const windowMs = rule.windowMs ?? 60_000;
  const key = bucketKey(ip, rule);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, rule };
  }
  if (bucket.count >= rule.limit) {
    return { allowed: false, rule };
  }
  bucket.count++;
  return { allowed: true, rule };
}

/** Evict stale buckets periodically to avoid unbounded memory growth */
export function pruneRateLimitBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}
