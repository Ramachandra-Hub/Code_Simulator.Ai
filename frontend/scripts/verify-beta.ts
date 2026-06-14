/**
 * Beta Readiness Sprint verification
 * Run: npm run verify:beta
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { prisma } from "../src/server/core/db/prisma";
import { ANALYTICS_EVENTS } from "../src/server/beta/analytics-events";
import { FEEDBACK_TYPES } from "../src/server/beta/feedback-service";
import { DEFAULT_CHECKLIST } from "../src/server/beta/onboarding-service";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

function fileHas(path: string, needle: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(needle);
}

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];

  checks.push({
    name: "Prisma UserFeedback model",
    pass: readFileSync(resolve(root, "prisma/schema.prisma"), "utf8").includes("model UserFeedback"),
    detail: "feedback persistence",
  });

  checks.push({
    name: "Prisma UsageEvent model",
    pass: readFileSync(resolve(root, "prisma/schema.prisma"), "utf8").includes("model UsageEvent"),
    detail: "analytics persistence",
  });

  checks.push({
    name: "Feedback API route",
    pass: existsSync(resolve(root, "src/app/api/feedback/route.ts")),
    detail: "POST /api/feedback",
  });

  checks.push({
    name: "Analytics track API",
    pass: existsSync(resolve(root, "src/app/api/analytics/track/route.ts")),
    detail: "POST /api/analytics/track",
  });

  checks.push({
    name: "Onboarding API",
    pass: existsSync(resolve(root, "src/app/api/user/onboarding/route.ts")),
    detail: "GET/PATCH /api/user/onboarding",
  });

  checks.push({
    name: "System status API",
    pass: existsSync(resolve(root, "src/app/api/system/status/route.ts")),
    detail: "GET /api/system/status",
  });

  checks.push({
    name: "Beta dashboard API",
    pass: existsSync(resolve(root, "src/app/api/beta/dashboard/route.ts")),
    detail: "GET /api/beta/dashboard",
  });

  checks.push({
    name: "Beta dashboard page",
    pass: existsSync(resolve(root, "src/app/(dashboard)/dashboard/beta/page.tsx")),
    detail: "/dashboard/beta",
  });

  checks.push({
    name: "Beta insights API",
    pass: existsSync(resolve(root, "src/app/api/beta/insights/route.ts")),
    detail: "GET/POST /api/beta/insights",
  });

  checks.push({
    name: "Beta insights engine",
    pass: existsSync(resolve(root, "src/server/beta/beta-insights-service.ts")),
    detail: "drop-off, complaints, trends, weekly summaries",
  });

  checks.push({
    name: "Beta insights page",
    pass: existsSync(resolve(root, "src/app/(dashboard)/dashboard/beta/insights/page.tsx")),
    detail: "/dashboard/beta/insights",
  });

  checks.push({
    name: "Feedback widget UI",
    pass: fileHas(resolve(root, "src/components/beta/feedback-widget.tsx"), "Report Issue"),
    detail: "report + suggest + rate",
  });

  checks.push({
    name: "System status banner",
    pass: fileHas(resolve(root, "src/components/dashboard/dashboard-shell.tsx"), "SystemStatusBanner"),
    detail: "Ollama/Supabase/Judge0 banner",
  });

  checks.push({
    name: "Onboarding welcome + checklist",
    pass: fileHas(resolve(root, "src/components/beta/onboarding-panel.tsx"), "OnboardingWelcome"),
    detail: "first login + checklist",
  });

  checks.push({
    name: "Interview analytics events",
    pass: Object.values(ANALYTICS_EVENTS).includes("interview_started") && Object.values(ANALYTICS_EVENTS).includes("pdf_downloaded"),
    detail: ANALYTICS_EVENTS.INTERVIEW_STARTED,
  });

  checks.push({
    name: "Feedback types complete",
    pass: Object.keys(FEEDBACK_TYPES).length >= 4,
    detail: Object.values(FEEDBACK_TYPES).join(", "),
  });

  checks.push({
    name: "Onboarding checklist keys",
    pass: Object.keys(DEFAULT_CHECKLIST).length === 5,
    detail: Object.keys(DEFAULT_CHECKLIST).join(", "),
  });

  checks.push({
    name: "Friendly error messages",
    pass: existsSync(resolve(root, "src/lib/error-messages.ts")),
    detail: "Ollama/Supabase/Judge0 recovery",
  });

  checks.push({
    name: "Performance metrics service",
    pass: existsSync(resolve(root, "src/server/beta/performance-service.ts")),
    detail: "API latency tracking",
  });

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('UserFeedback', 'UsageEvent', 'UserOnboarding', 'PerformanceMetric', 'BetaWeeklySummary')
    `;
    dbOk = tables.length >= 4;
    checks.push({
      name: "Beta tables in database",
      pass: dbOk,
      detail: `${tables.length}/5 tables found`,
    });
  } catch (err) {
    checks.push({
      name: "Beta tables in database",
      pass: false,
      detail: err instanceof Error ? err.message : "DB unreachable — run npm run db:push",
    });
  }

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;

  console.log("\n=== Beta Readiness Verification ===\n");
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
