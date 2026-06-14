/**
 * PR-5 verification: Production Hardening Sprint
 * Run: npm run verify:pr5
 */
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { isProtectedPath, PROTECTED_PREFIXES } from "../src/server/lib/middleware-auth";
import { judge0Client } from "../src/server/career-intelligence/integrations/judge0-client";
import { recordPlacementReadiness } from "../src/server/career-intelligence/services/placement-readiness-service";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const checks: Check[] = [];

  checks.push({
    name: "Protected dashboard routes",
    pass: PROTECTED_PREFIXES.includes("/dashboard") && isProtectedPath("/dashboard/student"),
    detail: PROTECTED_PREFIXES.join(", "),
  });

  checks.push({
    name: "No nexusedge_role in auth-client",
    pass: !readFileSync(resolve(__dirname, "../src/lib/auth-client.ts"), "utf8").includes("nexusedge_role"),
    detail: "localStorage role removed",
  });

  checks.push({
    name: "dashboard-shell uses fetchSession",
    pass: readFileSync(resolve(__dirname, "../src/components/dashboard/dashboard-shell.tsx"), "utf8").includes("fetchSession"),
    detail: "/api/auth/me via fetchSession",
  });

  checks.push({
    name: "interview-store API-only",
    pass: !readFileSync(resolve(__dirname, "../src/lib/interview-store.ts"), "utf8").includes("localStorage"),
    detail: "GET /api/interviews",
  });

  checks.push({
    name: "resume-store API-only",
    pass: !readFileSync(resolve(__dirname, "../src/lib/resume-store.ts"), "utf8").includes("localStorage"),
    detail: "GET /api/resume",
  });

  checks.push({
    name: "Resume analysis API route",
    pass: existsSync(resolve(__dirname, "../src/app/api/resume/analysis/route.ts")),
    detail: "POST /api/resume/analysis",
  });

  checks.push({
    name: "Resume analysis page",
    pass: existsSync(resolve(__dirname, "../src/app/(dashboard)/resume-analysis/page.tsx")),
    detail: "/resume-analysis",
  });

  checks.push({
    name: "interview-engine.ts removed",
    pass: !existsSync(resolve(__dirname, "../src/lib/interview-engine.ts")),
    detail: "dead code cleanup",
  });

  checks.push({
    name: "ATS panel no hardcoded 87",
    pass: !readFileSync(resolve(__dirname, "../src/components/feature/tab-panels.tsx"), "utf8").includes("setScore(87)"),
    detail: "real AtsScore via API",
  });

  checks.push({
    name: "Judge0 production mode flag",
    pass: typeof judge0Client.isProductionMode === "function",
    detail: `production=${judge0Client.isProductionMode()}`,
  });

  checks.push({
    name: "PlacementReadinessService single writer",
    pass: typeof recordPlacementReadiness === "function",
    detail: "recordPlacementReadiness exported",
  });

  const careerCoach = readFileSync(resolve(__dirname, "../src/server/career-intelligence/services/career-coach-service.ts"), "utf8");
  const digitalTwin = readFileSync(resolve(__dirname, "../src/server/career-intelligence/memory/digital-twin.ts"), "utf8");
  const placementSvc = readFileSync(resolve(__dirname, "../src/server/career-intelligence/services/placement-service.ts"), "utf8");

  checks.push({
    name: "No direct placement writes in career-coach",
    pass: !careerCoach.includes("prisma.placementReadiness.create"),
    detail: "uses recordPlacementReadiness",
  });

  checks.push({
    name: "No direct placement writes in digital-twin",
    pass: !digitalTwin.includes("prisma.placementReadiness.create"),
    detail: "uses recordPlacementReadiness",
  });

  checks.push({
    name: "No direct placement writes in placement-service",
    pass: !placementSvc.includes("prisma.placementReadiness.create"),
    detail: "uses recordPlacementReadiness",
  });

  const health = readFileSync(resolve(__dirname, "../src/app/api/health/route.ts"), "utf8");
  checks.push({
    name: "Health exposes Judge0 status",
    pass: health.includes("judge0"),
    detail: "judge0 block in /api/health",
  });

  const passed = checks.filter((c) => c.pass).length;
  console.log("\nPR-5 Production Hardening Verification\n");
  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }
  console.log(`\n${passed}/${checks.length} checks passed\n`);
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
