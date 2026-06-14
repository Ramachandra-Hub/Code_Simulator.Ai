/**
 * Security & Deployment Sprint verification
 * Run: npm run verify:deployment
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { prisma } from "../src/server/core/db/prisma";
import { auditEnvironment, envSecurityPassed } from "../src/server/lib/env-security";
import { RATE_LIMIT_RULES } from "../src/server/lib/rate-limit";
import { BETA_ADMIN_ROLES, isBetaAdmin } from "../src/server/beta/beta-dashboard-service";
import { getMonitoringSnapshot } from "../src/server/beta/monitoring-service";
import { modelGateway } from "../src/server/core/model/model-gateway";
import { judge0Client } from "../src/server/career-intelligence/integrations/judge0-client";
import { isProtectedPath } from "../src/server/lib/middleware-auth";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

function fileHas(path: string, needle: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(needle);
}

const BETA_API_ROUTES = [
  "src/app/api/beta/dashboard/route.ts",
  "src/app/api/beta/insights/route.ts",
  "src/app/api/beta/ai-quality/route.ts",
  "src/app/api/beta/stability/route.ts",
  "src/app/api/beta/monitoring/route.ts",
];

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];
  const isProd = process.env.NODE_ENV === "production";

  // ─── Security audit ─────────────────────────────────────────────────────
  const envChecks = auditEnvironment(isProd);
  for (const c of envChecks) {
    checks.push({
      name: `Env: ${c.name}`,
      pass: c.pass || c.severity === "info",
      detail: `${c.severity}: ${c.detail}`,
    });
  }

  const secretChecks = envChecks.filter((c) => c.name === "JWT_SECRET" || c.name === "NEXTAUTH_SECRET");
  checks.push({
    name: "JWT secrets production-ready",
    pass: secretChecks.every((c) => c.pass),
    detail: secretChecks.every((c) => c.pass)
      ? "Strong secrets configured"
      : "Rotate before external beta: openssl rand -base64 48",
  });

  checks.push({
    name: "Service role not in client bundle",
    pass: !fileHas(resolve(root, "src/lib/api-client.ts"), "SERVICE_ROLE"),
    detail: "SUPABASE_SERVICE_ROLE_KEY server-only",
  });

  for (const route of BETA_API_ROUTES) {
    const full = resolve(root, route);
    checks.push({
      name: `Admin guard: ${route.split("/").slice(-2, -1)[0]}`,
      pass: fileHas(full, "isBetaAdmin"),
      detail: "isBetaAdmin role check",
    });
  }

  checks.push({
    name: "Student blocked from beta admin",
    pass: !isBetaAdmin("student") && isBetaAdmin("super_admin"),
    detail: `roles: ${BETA_ADMIN_ROLES.join(", ")}`,
  });

  checks.push({
    name: "Dashboard routes protected",
    pass: isProtectedPath("/dashboard/beta") && isProtectedPath("/dashboard/beta/stability"),
    detail: "middleware auth required",
  });

  checks.push({
    name: "Feedback GET admin-only",
    pass: fileHas(resolve(root, "src/app/api/feedback/route.ts"), "isBetaAdmin"),
    detail: "POST open to authenticated users",
  });

  // ─── Production environment ───────────────────────────────────────────────
  checks.push({
    name: ".env.production.example exists",
    pass: existsSync(resolve(root, ".env.production.example")),
    detail: "production env template",
  });

  checks.push({
    name: "Production example documents secrets",
    pass: fileHas(resolve(root, ".env.production.example"), "JWT_SECRET"),
    detail: "required variables documented",
  });

  // ─── Rate limiting ────────────────────────────────────────────────────────
  const requiredLimits = [
    "/api/interviews",
    "/api/career/coach",
    "/api/feedback",
    "/api/beta/insights",
  ];
  for (const prefix of requiredLimits) {
    checks.push({
      name: `Rate limit: ${prefix}`,
      pass: RATE_LIMIT_RULES.some((r) => r.prefix === prefix),
      detail: `${RATE_LIMIT_RULES.find((r) => r.prefix === prefix)?.limit ?? 0}/min`,
    });
  }

  checks.push({
    name: "PDF generation rate limit",
    pass: RATE_LIMIT_RULES.some((r) => r.prefix === "/api/interviews" && r.match),
    detail: "stricter limit for /pdf paths",
  });

  checks.push({
    name: "Middleware uses rate limiter",
    pass: fileHas(resolve(root, "src/middleware.ts"), "checkRateLimit"),
    detail: "centralized rate-limit module",
  });

  // ─── Monitoring ───────────────────────────────────────────────────────────
  checks.push({
    name: "Monitoring service",
    pass: existsSync(resolve(root, "src/server/beta/monitoring-service.ts")),
    detail: "error rate + latency aggregates",
  });

  checks.push({
    name: "Monitoring API",
    pass: existsSync(resolve(root, "src/app/api/beta/monitoring/route.ts")),
    detail: "GET /api/beta/monitoring",
  });

  // ─── Live dependency checks ─────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "Supabase / database", pass: true, detail: "connected" });
  } catch (err) {
    checks.push({
      name: "Supabase / database",
      pass: false,
      detail: err instanceof Error ? err.message : "unreachable",
    });
  }

  const ollamaInfo = await modelGateway.getOllamaInfo();
  checks.push({
    name: "Ollama reachable",
    pass: ollamaInfo.available,
    detail: ollamaInfo.available ? ollamaInfo.baseUrl : "offline",
  });

  const judge0Up = await judge0Client.isAvailable();
  const judge0Required = judge0Client.isProductionMode();
  checks.push({
    name: "Judge0 status",
    pass: judge0Up || !judge0Required,
    detail: judge0Up ? "online" : judge0Required ? "required but offline" : "offline (dev ok)",
  });

  try {
    const snap = await getMonitoringSnapshot(1);
    checks.push({
      name: "Monitoring snapshot",
      pass: typeof snap.errorRate.totalErrors === "number",
      detail: `api avg ${snap.apiLatency.avgMs}ms, db avg ${snap.databaseLatency.avgMs}ms`,
    });
  } catch (err) {
    checks.push({
      name: "Monitoring snapshot",
      pass: false,
      detail: err instanceof Error ? err.message : "failed",
    });
  }

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;

  console.log("\n=== Security & Deployment Verification ===\n");
  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name}`);
    console.log(`  ${c.detail}\n`);
  }
  console.log(`Result: ${passed}/${total} checks passed\n`);

  await prisma.$disconnect();
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
