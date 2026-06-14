/**
 * PR-10 AI Talent Intelligence Platform verification
 * Run: npm run verify:pr10
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { agentRegistry } from "../src/server/core/agent/agent-registry";
import { computeGrowthPotential } from "../src/server/talent/engines/growth-potential-engine";
import { computeCareerVelocity } from "../src/server/talent/engines/career-velocity-engine";
import { computeJobFit } from "../src/server/talent/engines/job-fit-engine";
import { computeHiringRecommendation } from "../src/server/talent/engines/hiring-recommendation-engine";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

function fileHas(path: string, needle: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(needle);
}

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];

  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
  for (const model of [
    "JobDescription",
    "RecruiterCompany",
    "RecruiterUser",
    "CandidateShortlist",
    "TalentMatch",
    "HiringDecision",
    "GrowthPotentialSnapshot",
    "RecruiterSearch",
    "TalentRadarSnapshot",
  ]) {
    checks.push({ name: `Model ${model}`, pass: schema.includes(`model ${model}`), detail: "database" });
  }

  const agents = [
    "recruiter-screening",
    "talent-matching",
    "candidate-ranking",
    "hiring-recommendation",
    "growth-potential",
    "job-fit",
    "talent-radar",
    "recruiter-copilot",
  ];
  for (const id of agents) {
    const agent = agentRegistry.get(id);
    checks.push({ name: `Agent ${id}`, pass: Boolean(agent), detail: agent?.definition.name || "missing" });
  }

  checks.push({ name: "Growth potential engine", pass: existsSync(resolve(root, "src/server/talent/engines/growth-potential-engine.ts")), detail: "engine" });
  checks.push({ name: "Career velocity engine", pass: existsSync(resolve(root, "src/server/talent/engines/career-velocity-engine.ts")), detail: "engine" });
  checks.push({ name: "Job fit engine", pass: existsSync(resolve(root, "src/server/talent/engines/job-fit-engine.ts")), detail: "engine" });
  checks.push({ name: "Hiring recommendation engine", pass: existsSync(resolve(root, "src/server/talent/engines/hiring-recommendation-engine.ts")), detail: "engine" });
  checks.push({ name: "Talent intelligence service", pass: existsSync(resolve(root, "src/server/talent/services/talent-intelligence-service.ts")), detail: "service" });

  for (const route of [
    "recruiter/overview",
    "recruiter/candidates",
    "recruiter/shortlists",
    "recruiter/analytics",
    "talent/radar",
    "jobs",
    "matching/run",
    "copilot",
  ]) {
    checks.push({
      name: `API /api/${route}`,
      pass: existsSync(resolve(root, `src/app/api/${route}/route.ts`)),
      detail: "endpoint",
    });
  }
  checks.push({ name: "API /api/recruiter/candidates/[id]", pass: existsSync(resolve(root, "src/app/api/recruiter/candidates/[id]/route.ts")), detail: "profile" });
  checks.push({ name: "API /api/jobs/[id]/match", pass: existsSync(resolve(root, "src/app/api/jobs/[id]/match/route.ts")), detail: "job fit" });

  for (const page of ["", "candidates", "radar", "copilot", "jobs", "shortlists", "analytics"]) {
    const path = page ? `src/app/(recruiter)/recruiter/${page}/page.tsx` : "src/app/(recruiter)/recruiter/page.tsx";
    checks.push({ name: `Portal /recruiter${page ? `/${page}` : ""}`, pass: existsSync(resolve(root, path)), detail: "UI" });
  }
  checks.push({ name: "Candidate profile page", pass: existsSync(resolve(root, "src/app/(recruiter)/recruiter/candidates/[id]/page.tsx")), detail: "intelligence" });
  checks.push({ name: "Recruiter shell", pass: existsSync(resolve(root, "src/components/recruiter/recruiter-shell.tsx")), detail: "layout" });
  checks.push({ name: "Digital twin first", pass: fileHas(resolve(root, "src/server/talent/services/talent-intelligence-service.ts"), "ensureDigitalTwin"), detail: "not resume-only" });

  const growth = computeGrowthPotential({
    interviewTrend: 70,
    codingTrend: 65,
    roadmapCompletion: 55,
    githubGrowth: 40,
    coachEngagement: 50,
    learningConsistency: 60,
  });
  checks.push({ name: "Growth tier output", pass: ["low", "medium", "high", "exceptional"].includes(growth.tier), detail: growth.tier });

  const velocity = computeCareerVelocity({
    snapshots: [
      { date: new Date(Date.now() - 60 * 86400000), technical: 50, interview: 45, coding: 40, professional: 35 },
      { date: new Date(), technical: 65, interview: 60, coding: 55, professional: 50 },
    ],
  });
  checks.push({ name: "Career velocity score", pass: velocity.careerVelocityScore > 0, detail: String(velocity.careerVelocityScore) });

  const fit = computeJobFit({
    jobSkills: ["Java", "Spring"],
    jobTitle: "Backend Engineer",
    jobDescription: "Java Spring backend API",
    candidate: {
      technicalScore: 75,
      codingReadiness: 70,
      communicationScore: 65,
      confidenceScore: 60,
      panelReadiness: 55,
      professionalReadiness: 60,
      githubScore: 50,
      linkedinScore: 45,
      leetcodeScore: 65,
      skills: ["Java", "Spring"],
      strengths: ["Backend"],
    },
  });
  checks.push({ name: "Job fit overall", pass: fit.overallMatch > 0, detail: String(fit.overallMatch) });

  const hire = computeHiringRecommendation({
    placementReadiness: 75,
    growthPotentialScore: 70,
    careerVelocityScore: 65,
    panelReadiness: 60,
    professionalReadiness: 55,
    twinStrengths: ["DSA"],
    twinWeaknesses: ["System design"],
  });
  checks.push({ name: "Hiring decision", pass: Boolean(hire.decision), detail: hire.decision });

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);

  console.log("\n=== PR-10 Talent Intelligence Verification ===\n");
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
