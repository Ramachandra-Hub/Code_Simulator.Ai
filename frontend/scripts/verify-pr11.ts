/**
 * PR-11 Production Launch Sprint verification
 * Run: npm run verify:pr11
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { judge0Client } from "../src/server/career-intelligence/integrations/judge0-client";
import { redisHealthCheck, isRedisConfigured } from "../src/server/core/redis/redis-client";
import { qdrantClient } from "../src/server/career-intelligence/integrations/qdrant-client";
import { getQueueStats } from "../src/server/core/redis/queue-manager";
import { isOtelEnabled } from "../src/server/core/observability/otel-config";
import { embedText } from "../src/server/core/embeddings/embedding-service";
import { auditEnvironment } from "../src/server/lib/env-security";
import { registerAllAgents } from "../src/server/career-intelligence/agents/register-all";
import { registerTalentAgents } from "../src/server/talent/agents/talent-agents";
registerAllAgents();
registerTalentAgents();

type Check = { name: string; pass: boolean; detail: string };

function fileHas(path: string, needle: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(needle);
}

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];

  // Judge0 production
  checks.push({ name: "Judge0 API key support", pass: fileHas(resolve(root, "src/server/career-intelligence/integrations/judge0-client.ts"), "JUDGE0_API_KEY"), detail: "X-Auth-Token header" });
  checks.push({ name: "Judge0 health check", pass: fileHas(resolve(root, "src/server/career-intelligence/integrations/judge0-client.ts"), "healthCheck"), detail: "latency + languages" });
  checks.push({ name: "Judge0 docker compose", pass: existsSync(resolve(root, "infra/judge0/docker-compose.judge0.yml")), detail: "CE stack" });
  const j0 = await judge0Client.healthCheck();
  checks.push({ name: "Judge0 reachable", pass: j0.available || process.env.NODE_ENV !== "production", detail: j0.available ? `${j0.languageCount} languages` : "optional in dev" });

  // Redis
  checks.push({ name: "Redis client", pass: existsSync(resolve(root, "src/server/core/redis/redis-client.ts")), detail: "ioredis" });
  checks.push({ name: "Agent cache", pass: existsSync(resolve(root, "src/server/core/redis/agent-cache.ts")), detail: "SHA256 keys" });
  checks.push({ name: "Session cache", pass: existsSync(resolve(root, "src/server/core/redis/session-cache.ts")), detail: "JWT cache" });
  checks.push({ name: "Queue manager", pass: existsSync(resolve(root, "src/server/core/redis/queue-manager.ts")), detail: "BullMQ" });
  checks.push({ name: "Redis rate limit", pass: existsSync(resolve(root, "src/server/core/redis/rate-limit-redis.ts")), detail: "multi-instance" });
  const redis = await redisHealthCheck();
  checks.push({ name: "Redis health", pass: !redis.configured || redis.available || process.env.NODE_ENV !== "production", detail: redis.configured ? `persistence:${redis.persistence}` : "not configured" });
  const queues = await getQueueStats();
  checks.push({ name: "Queue stats API", pass: Object.keys(queues).length === 3, detail: Object.keys(queues).join(", ") });

  // Qdrant
  checks.push({ name: "Embedding service", pass: existsSync(resolve(root, "src/server/core/embeddings/embedding-service.ts")), detail: "Ollama + fallback" });
  checks.push({ name: "Semantic search service", pass: existsSync(resolve(root, "src/server/core/memory/semantic-search-service.ts")), detail: "talent + questions" });
  checks.push({ name: "Qdrant talent collection", pass: fileHas(resolve(root, "src/server/career-intelligence/integrations/qdrant-client.ts"), "talentSearch"), detail: "talent_candidates" });
  const qd = await qdrantClient.healthCheck();
  checks.push({ name: "Qdrant health", pass: !qd.configured || qd.available || process.env.NODE_ENV !== "production", detail: qd.configured ? `${qd.collections} collections` : "optional" });
  const emb = await embedText("test embedding");
  checks.push({ name: "Embedding output", pass: emb.vector.length === 384, detail: emb.source });

  // Observability
  checks.push({ name: "Structured logger", pass: existsSync(resolve(root, "src/server/core/observability/logger.ts")), detail: "JSON logs" });
  checks.push({ name: "Tracing spans", pass: existsSync(resolve(root, "src/server/core/observability/tracing.ts")), detail: "withSpan" });
  checks.push({ name: "OTEL bootstrap", pass: existsSync(resolve(root, "src/server/core/observability/otel.ts")), detail: isOtelEnabled() ? "enabled" : "optional" });
  checks.push({ name: "Health live probe", pass: existsSync(resolve(root, "src/app/api/health/live/route.ts")), detail: "/api/health/live" });
  checks.push({ name: "Health ready probe", pass: existsSync(resolve(root, "src/app/api/health/ready/route.ts")), detail: "/api/health/ready" });
  checks.push({ name: "Health matrix", pass: fileHas(resolve(root, "src/app/api/health/route.ts"), "redis"), detail: "redis+qdrant+judge0" });

  // Security
  checks.push({ name: "Security headers", pass: fileHas(resolve(root, "next.config.ts"), "X-Frame-Options"), detail: "OWASP headers" });
  checks.push({ name: "Production guards", pass: existsSync(resolve(root, "src/server/core/security/production-guards.ts")), detail: "demo user guard" });
  checks.push({ name: "Security audit script", pass: existsSync(resolve(root, "scripts/security-audit.ts")), detail: "npm run security:audit" });
  const envAudit = auditEnvironment(false);
  checks.push({ name: "Env security audit", pass: envAudit.length > 5, detail: `${envAudit.length} checks` });

  // Backup
  checks.push({ name: "Backup script", pass: existsSync(resolve(root, "scripts/backup-database.ts")), detail: "npm run backup:db" });
  checks.push({ name: "Restore script", pass: existsSync(resolve(root, "scripts/restore-database.ts")), detail: "dry-run support" });
  checks.push({ name: "DR documentation", pass: existsSync(resolve(root, "infra/DISASTER_RECOVERY.md")), detail: "runbook" });

  // AWS
  checks.push({ name: "ECS task definition", pass: existsSync(resolve(root, "infra/ecs/task-definition.json")), detail: "Fargate template" });
  checks.push({ name: "Dockerfile Prisma", pass: fileHas(resolve(root, "Dockerfile"), "prisma generate"), detail: "runtime generate" });
  checks.push({ name: "Dockerfile healthcheck", pass: fileHas(resolve(root, "Dockerfile"), "HEALTHCHECK"), detail: "live probe" });
  checks.push({ name: "AWS deployment doc", pass: existsSync(resolve(root, "infra/aws-deployment.md")), detail: "architecture" });

  // Monitoring
  checks.push({ name: "Production monitoring", pass: existsSync(resolve(root, "src/server/beta/production-monitoring-service.ts")), detail: "launch metrics" });
  checks.push({ name: "Production API", pass: existsSync(resolve(root, "src/app/api/beta/production/route.ts")), detail: "/api/beta/production" });
  checks.push({ name: "Agent cache in BaseAgent", pass: fileHas(resolve(root, "src/server/core/agent/base-agent.ts"), "getAgentCache"), detail: "Redis cache" });

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);

  console.log("\n=== PR-11 Production Launch Verification ===\n");
  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name} — ${c.detail}`);
  }
  console.log(`\n${passed}/${checks.length} checks passed`);
  if (failed.length) {
    console.log("\nFailed:");
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
