/**
 * PR-13 Virtual Office Simulator verification
 * Run: npm run verify:pr13
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { agentRegistry } from "../src/server/core/agent/agent-registry";
import { registerAllAgents } from "../src/server/career-intelligence/agents/register-all";
import { registerTalentAgents } from "../src/server/talent/agents/talent-agents";
import { registerCareerOSAgents } from "../src/server/career-os/agents/career-os-agents";
import { registerOfficeAgents } from "../src/server/virtual-office/agents/office-agents";
import { generateTasksForRole } from "../src/server/virtual-office/engines/task-engine";
import { evaluateStandup } from "../src/server/virtual-office/engines/standup-evaluator";
import { runCodeReview } from "../src/server/virtual-office/engines/code-review-engine";
import { computePerformanceReview } from "../src/server/virtual-office/engines/performance-review-engine";

registerAllAgents();
registerTalentAgents();
registerCareerOSAgents();
registerOfficeAgents();

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];
  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

  for (const model of [
    "VirtualCompany", "VirtualDepartment", "OfficeSession", "WorkTask", "Meeting",
    "StandupReport", "CodeReview", "PerformanceReview", "PromotionAssessment", "OfficeAchievement",
  ]) {
    checks.push({ name: `Model ${model}`, pass: schema.includes(`model ${model}`), detail: "database" });
  }

  for (const field of ["leadershipScore", "ownershipScore", "collaborationScore", "promotionReadiness"]) {
    checks.push({ name: `Twin field ${field}`, pass: schema.includes(field), detail: "digital twin" });
  }

  const agents = [
    "ceo", "engineering-director", "engineering-manager", "team-lead", "senior-engineer",
    "qa", "product-manager", "hr-business-partner", "client", "performance-review",
  ];
  for (const id of agents) {
    const a = agentRegistry.get(id);
    checks.push({ name: `Agent ${id}`, pass: Boolean(a), detail: a?.definition.name || "missing" });
  }

  for (const f of ["task-engine", "standup-evaluator", "code-review-engine", "meeting-engine", "performance-review-engine"]) {
    checks.push({ name: `Engine ${f}`, pass: existsSync(resolve(root, `src/server/virtual-office/engines/${f}.ts`)), detail: "engine" });
  }
  checks.push({ name: "Virtual office service", pass: existsSync(resolve(root, "src/server/virtual-office/services/virtual-office-service.ts")), detail: "orchestration" });

  const twinSrc = readFileSync(resolve(root, "src/server/career-intelligence/memory/digital-twin.ts"), "utf8");
  checks.push({ name: "Twin office signal", pass: twinSrc.includes('signal.type === "office"'), detail: "office handler" });
  checks.push({ name: "CareerOS integration", pass: readFileSync(resolve(root, "src/server/virtual-office/services/virtual-office-service.ts"), "utf8").includes("gatherCareerOSContext"), detail: "context reuse" });

  for (const route of ["overview", "work", "standups", "tasks", "meetings", "code-reviews", "performance", "promotion", "analytics"]) {
    checks.push({ name: `API /api/office/${route}`, pass: existsSync(resolve(root, `src/app/api/office/${route}/route.ts`)), detail: "endpoint" });
  }
  checks.push({ name: "API task complete", pass: existsSync(resolve(root, "src/app/api/office/tasks/[id]/route.ts")), detail: "PATCH" });
  checks.push({ name: "API meeting complete", pass: existsSync(resolve(root, "src/app/api/office/meetings/[id]/route.ts")), detail: "PATCH" });

  for (const page of ["", "work", "meetings", "standups", "tasks", "code-reviews", "performance", "promotion"]) {
    const path = page ? `src/app/(dashboard)/office/${page}/page.tsx` : "src/app/(dashboard)/office/page.tsx";
    checks.push({ name: `UI /office${page ? `/${page}` : ""}`, pass: existsSync(resolve(root, path)), detail: "dashboard" });
  }
  checks.push({ name: "Office shell", pass: existsSync(resolve(root, "src/components/virtual-office/office-shell.tsx")), detail: "layout" });
  checks.push({ name: "Office client", pass: existsSync(resolve(root, "src/lib/office-client.ts")), detail: "client" });
  checks.push({ name: "Nav link", pass: readFileSync(resolve(root, "src/lib/constants.ts"), "utf8").includes('"/office"'), detail: "student nav" });
  checks.push({ name: "Init registration", pass: readFileSync(resolve(root, "src/server/init.ts"), "utf8").includes("registerOfficeAgents"), detail: "agents boot" });

  const tasks = generateTasksForRole("software_engineer", 4);
  checks.push({ name: "Task generation", pass: tasks.length >= 4, detail: `${tasks.length} tasks` });

  const standup = evaluateStandup({
    yesterday: "Shipped pagination API and merged PR #42. Reduced latency by 15%.",
    today: "Own the auth middleware bug fix and pair with QA on regression suite.",
    blockers: "Need platform team review on shared library bump.",
  });
  checks.push({ name: "Standup evaluation", pass: standup.communicationScore > 60, detail: `comm=${standup.communicationScore}` });

  const review = runCodeReview({ code: "export async function handler() { try { return await db.user.findMany(); } catch (e) { throw e; } }" });
  checks.push({ name: "Code review questions", pass: review.questions.length === 3, detail: review.questions[0]?.slice(0, 30) || "" });

  const perf = computePerformanceReview("weekly", {
    standupAvg: { communication: 70, ownership: 65, professionalism: 72 },
    taskCompletionRate: 80,
    codeReviewAvg: 75,
    meetingParticipation: 68,
    twin: { technicalScore: 70, communicationScore: 65, leadershipScore: 60, ownershipScore: 62, collaborationScore: 64, stakeholderManagement: 58 },
  });
  checks.push({ name: "Performance dimensions", pass: perf.promotionReady > 0 && perf.technical > 0, detail: `promo=${perf.promotionReady}` });

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);
  console.log("\n=== PR-13 Virtual Office Verification ===\n");
  for (const c of checks) console.log(`${c.pass ? "✓" : "✗"} ${c.name} — ${c.detail}`);
  console.log(`\n${passed}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}`));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
