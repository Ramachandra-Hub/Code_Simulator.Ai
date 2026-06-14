/**
 * PR-6 verification: Self-Improving Intelligence Layer
 * Run: npm run verify:pr6
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });
import { prisma } from "../src/server/core/db/prisma";
import {
  computeQuestionEffectiveness,
  computeRecommendationEffectiveness,
} from "../src/server/intelligence/intelligence-keys";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];
  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

  for (const model of [
    "QuestionEffectiveness",
    "RecommendationEffectiveness",
    "RecommendationOutcome",
    "InterviewQualityEvent",
    "IntelligenceImprovementReport",
  ]) {
    checks.push({
      name: `Prisma ${model}`,
      pass: schema.includes(`model ${model}`),
      detail: model,
    });
  }

  const services = [
    "question-intelligence-service.ts",
    "recommendation-intelligence-service.ts",
    "ai-quality-dashboard-service.ts",
    "improvement-report-service.ts",
  ];
  for (const s of services) {
    checks.push({
      name: `Intelligence service ${s}`,
      pass: existsSync(resolve(root, `src/server/intelligence/${s}`)),
      detail: s,
    });
  }

  checks.push({
    name: "AI quality API",
    pass: existsSync(resolve(root, "src/app/api/beta/ai-quality/route.ts")),
    detail: "GET/POST /api/beta/ai-quality",
  });

  checks.push({
    name: "Recommendation outcome API",
    pass: existsSync(resolve(root, "src/app/api/intelligence/recommendations/outcome/route.ts")),
    detail: "POST /api/intelligence/recommendations/outcome",
  });

  checks.push({
    name: "AI quality dashboard page",
    pass: existsSync(resolve(root, "src/app/(dashboard)/dashboard/beta/ai-quality/page.tsx")),
    detail: "/dashboard/beta/ai-quality",
  });

  checks.push({
    name: "Interview hooks wired",
    pass: readFileSync(resolve(root, "src/server/career-intelligence/services/interview-service.ts"), "utf8")
      .includes("recordQuestionAnswered"),
    detail: "question intelligence on submitAnswer",
  });

  checks.push({
    name: "Career coach hooks wired",
    pass: readFileSync(resolve(root, "src/server/career-intelligence/services/career-coach-service.ts"), "utf8")
      .includes("recordRecommendationsShown"),
    detail: "recommendation tracking on coach run",
  });

  checks.push({
    name: "Effectiveness heuristics",
    pass:
      computeQuestionEffectiveness({
        timesAsked: 10,
        timesAnswered: 8,
        timesSkipped: 0,
        timesAbandoned: 2,
        followUpCount: 3,
        followUpImproved: 2,
        avgScore: 75,
        avgEngagement: 80,
        avgRatingImpact: 4,
      }) > 0,
    detail: "question score computed",
  });

  checks.push({
    name: "Recommendation heuristics",
    pass:
      computeRecommendationEffectiveness({
        timesShown: 10,
        timesAccepted: 6,
        timesCompleted: 4,
        timesIgnored: 2,
        avgPlacementDelta: 5,
        avgRating: 4,
      }) > 0,
    detail: "recommendation score computed",
  });

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('QuestionEffectiveness', 'RecommendationEffectiveness', 'IntelligenceImprovementReport')
    `;
    dbOk = tables.length >= 3;
    checks.push({ name: "PR-6 tables in database", pass: dbOk, detail: `${tables.length}/3 core tables` });
  } catch (err) {
    checks.push({
      name: "PR-6 tables in database",
      pass: false,
      detail: err instanceof Error ? err.message : "run npm run db:push",
    });
  }

  const passed = checks.filter((c) => c.pass).length;
  console.log("\n=== PR-6 Intelligence Layer Verification ===\n");
  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name}`);
    console.log(`  ${c.detail}\n`);
  }
  console.log(`Result: ${passed}/${checks.length} checks passed\n`);
  await prisma.$disconnect();
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
