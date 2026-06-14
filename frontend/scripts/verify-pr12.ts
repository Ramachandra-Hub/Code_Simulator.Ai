/**
 * PR-12 CareerOS verification
 * Run: npm run verify:pr12
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { agentRegistry } from "../src/server/core/agent/agent-registry";
import { generateDailyMission } from "../src/server/career-os/engines/mission-engine";
import { computePlacementPrediction } from "../src/server/career-os/engines/placement-prediction-engine";
import { computeLearningVelocity } from "../src/server/career-os/engines/learning-velocity-engine";
import { computeFuturePotential } from "../src/server/career-os/engines/future-potential-engine";
import { registerAllAgents } from "../src/server/career-intelligence/agents/register-all";
import { registerTalentAgents } from "../src/server/talent/agents/talent-agents";
import { registerCareerOSAgents } from "../src/server/career-os/agents/career-os-agents";

registerAllAgents();
registerTalentAgents();
registerCareerOSAgents();

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];
  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

  for (const model of [
    "CareerGoal", "DailyMission", "WeeklyMission", "MonthlyMission", "HabitTracker",
    "ProgressSnapshot", "PlacementPrediction", "LearningVelocitySnapshot",
    "FuturePotentialSnapshot", "CareerMilestone",
  ]) {
    checks.push({ name: `Model ${model}`, pass: schema.includes(`model ${model}`), detail: "database" });
  }

  const agents = [
    "career-manager", "goal-planner", "task-planner", "habit-coach",
    "progress-tracking", "placement-prediction", "learning-velocity", "future-potential",
  ];
  for (const id of agents) {
    const a = agentRegistry.get(id);
    checks.push({ name: `Agent ${id}`, pass: Boolean(a), detail: a?.definition.name || "missing" });
  }

  for (const f of ["mission-engine", "placement-prediction-engine", "learning-velocity-engine", "future-potential-engine"]) {
    checks.push({ name: `Engine ${f}`, pass: existsSync(resolve(root, `src/server/career-os/engines/${f}.ts`)), detail: "engine" });
  }
  checks.push({ name: "CareerOS service", pass: existsSync(resolve(root, "src/server/career-os/services/career-os-service.ts")), detail: "orchestration" });
  checks.push({ name: "Twin integration", pass: readFileSync(resolve(root, "src/server/career-os/services/career-os-service.ts"), "utf8").includes("ensureDigitalTwin"), detail: "not hardcoded" });

  for (const route of ["career-os/overview", "career-os/habits", "career-os/achievements", "goals", "missions", "predictions", "velocity", "potential"]) {
    checks.push({ name: `API /api/${route}`, pass: existsSync(resolve(root, `src/app/api/${route}/route.ts`)), detail: "endpoint" });
  }

  for (const page of ["", "missions", "goals", "habits", "progress", "forecast", "potential", "achievements"]) {
    const path = page ? `src/app/(dashboard)/career-os/${page}/page.tsx` : "src/app/(dashboard)/career-os/page.tsx";
    checks.push({ name: `UI /career-os${page ? `/${page}` : ""}`, pass: existsSync(resolve(root, path)), detail: "dashboard" });
  }
  checks.push({ name: "CareerOS shell", pass: existsSync(resolve(root, "src/components/career-os/career-os-shell.tsx")), detail: "layout" });

  const mission = generateDailyMission({
    weaknesses: ["DSA", "System Design"],
    strengths: ["React"],
    codingReadiness: 55,
    interviewReadiness: 50,
    technicalScore: 60,
    githubScore: 40,
    leetcodeScore: 45,
    professionalReadiness: 50,
    targetRole: "Backend Engineer",
    roadmapPending: ["Complete API module"],
    interviewImprovements: ["system design"],
  });
  checks.push({ name: "Daily mission tasks", pass: mission.tasks.length >= 3, detail: `${mission.tasks.length} tasks` });

  const pred = computePlacementPrediction({
    placementReadiness: 65,
    interviewReadiness: 60,
    codingReadiness: 55,
    professionalReadiness: 50,
    learningVelocityScore: 55,
    habitStreak: 3,
    coachEngagement: 2,
    weaknesses: ["DSA"],
    horizonDays: 30,
  });
  checks.push({ name: "Placement prediction", pass: pred.probability > 0, detail: `${pred.probability}%` });

  const lv = computeLearningVelocity({ skillGrowth: 12, codingGrowth: 15, interviewGrowth: 10, professionalGrowth: 8, consistencyDays: 5 });
  checks.push({ name: "Learning velocity tier", pass: ["slow", "moderate", "fast", "exceptional"].includes(lv.tier), detail: lv.tier });

  const fp = computeFuturePotential({
    placementReadiness: 65,
    growthPotentialScore: 70,
    learningVelocityScore: 55,
    coachEngagement: 3,
    projectActivity: 50,
    consistencyScore: 60,
    panelReadiness: 55,
    strengths: ["Leadership"],
  });
  checks.push({ name: "Future potential", pass: fp.futurePotential >= fp.currentPotential, detail: String(fp.futurePotential) });

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);
  console.log("\n=== PR-12 CareerOS Verification ===\n");
  for (const c of checks) console.log(`${c.pass ? "✓" : "✗"} ${c.name} — ${c.detail}`);
  console.log(`\n${passed}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}`));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
