/**
 * Stability Sprint verification
 * Run: npm run verify:stability
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { prisma } from "../src/server/core/db/prisma";
import { getStabilityReport } from "../src/server/beta/stability-service";
import { logSystemError } from "../src/server/beta/system-error-service";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

function fileHas(path: string, needle: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(needle);
}

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];

  checks.push({
    name: "Prisma SystemError model",
    pass: readFileSync(resolve(root, "prisma/schema.prisma"), "utf8").includes("model SystemError"),
    detail: "error persistence",
  });

  checks.push({
    name: "System error service",
    pass: existsSync(resolve(root, "src/server/beta/system-error-service.ts")),
    detail: "API/Ollama/Prisma logging",
  });

  checks.push({
    name: "Stability service",
    pass: existsSync(resolve(root, "src/server/beta/stability-service.ts")),
    detail: "crash frequency + slowest routes",
  });

  checks.push({
    name: "Stability API route",
    pass: existsSync(resolve(root, "src/app/api/beta/stability/route.ts")),
    detail: "GET /api/beta/stability",
  });

  checks.push({
    name: "Performance ingest API",
    pass: existsSync(resolve(root, "src/app/api/beta/performance/route.ts")),
    detail: "POST /api/beta/performance",
  });

  checks.push({
    name: "Stability dashboard page",
    pass: existsSync(resolve(root, "src/app/(dashboard)/dashboard/beta/stability/page.tsx")),
    detail: "/dashboard/beta/stability",
  });

  checks.push({
    name: "Page load tracker",
    pass: fileHas(resolve(root, "src/components/beta/page-load-tracker.tsx"), "recordPageLoad"),
    detail: "client-side page timing",
  });

  checks.push({
    name: "Interview response timing",
    pass: fileHas(resolve(root, "src/app/api/interviews/[id]/answer/route.ts"), "interview_response"),
    detail: "withPerformance on answer route",
  });

  checks.push({
    name: "Career coach timing",
    pass: fileHas(resolve(root, "src/app/api/career/coach/route.ts"), "career_coach"),
    detail: "withPerformance on coach POST",
  });

  checks.push({
    name: "Prisma query latency hook",
    pass: fileHas(resolve(root, "src/server/core/db/prisma.ts"), 'category: "database"'),
    detail: "extension tracks DB ops",
  });

  checks.push({
    name: "Ollama failure logging",
    pass: fileHas(resolve(root, "src/server/core/model/model-gateway.ts"), "logOllamaError"),
    detail: "model gateway errors",
  });

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('SystemError', 'PerformanceMetric')
    `;
    dbOk = tables.length >= 2;
    checks.push({
      name: "Stability tables in database",
      pass: dbOk,
      detail: `${tables.length}/2 tables found`,
    });
  } catch (err) {
    checks.push({
      name: "Stability tables in database",
      pass: false,
      detail: err instanceof Error ? err.message : "DB unreachable — run npm run db:push",
    });
  }

  if (dbOk) {
    try {
      await logSystemError({
        source: "api",
        route: "/verify-stability",
        message: "verify-stability probe",
        method: "GET",
      });
      const report = await getStabilityReport(1);
      checks.push({
        name: "Stability report generation",
        pass: typeof report.crashFrequency.totalErrors === "number",
        detail: `${report.crashFrequency.totalErrors} errors in last hour`,
      });
    } catch (err) {
      checks.push({
        name: "Stability report generation",
        pass: false,
        detail: err instanceof Error ? err.message : "report failed",
      });
    }
  }

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;

  console.log("\n=== Stability Sprint Verification ===\n");
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
