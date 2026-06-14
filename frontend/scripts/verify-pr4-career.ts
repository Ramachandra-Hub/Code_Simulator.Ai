/**
 * PR-4 verification: Career Coach + Twin + PDF
 * Run: npm run verify:pr4
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import { getPrompt, listPrompts } from "../src/server/career-intelligence/prompts";
import { analyzeStudentHeuristic, computePlacementHeuristic } from "../src/server/career-intelligence/evaluators/career-metrics";
import { buildCareerCoachGraph } from "../src/server/career-intelligence/workflows/career-coach-graph";
import { createTextPdf } from "../src/server/career-intelligence/services/pdf-generator";
import { AgentFactory } from "../src/server/core/agent/agent-factory";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

const mockProfile = {
  id: "p1",
  userId: "u1",
  placementScore: 62,
  codingReadiness: 55,
  algorithmSkills: 48,
  problemSolving: 52,
  optimizationSkills: 45,
  interviewReadiness: 68,
  communicationScore: 60,
  confidenceScore: 58,
  speakingSkills: 55,
  technicalScore: 58,
  githubScore: 0,
  linkedinScore: 0,
  leetcodeScore: 0,
  hackerrankScore: 0,
  professionalReadiness: 0,
  portfolioStrength: 0,
  executiveCommunication: 0,
  stakeholderManagement: 0,
  pressureHandling: 0,
  panelReadiness: 0,
  leadershipScore: 0,
  ownershipScore: 0,
  collaborationScore: 0,
  promotionReadiness: 0,
  strengths: ["Engaged learner"],
  weaknesses: ["Needs coding practice"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function main() {
  const checks: Check[] = [];

  checks.push({
    name: "PromptRegistry career prompts",
    pass: listPrompts("career").length >= 2,
    detail: listPrompts("career").map((p) => p.id).join(", "),
  });

  try {
    const p = getPrompt("career", "recommendations", "v2");
    checks.push({ name: "getPrompt career.recommendations.v2", pass: p.structured === true, detail: p.id });
  } catch (e) {
    checks.push({ name: "getPrompt career.recommendations.v2", pass: false, detail: String(e) });
  }

  const analysis = analyzeStudentHeuristic(mockProfile as typeof mockProfile & { userId: string });
  checks.push({
    name: "Heuristic career analysis",
    pass: analysis.source === "heuristic" && Object.keys(analysis.skillGaps).length > 0,
    detail: `gaps=${Object.keys(analysis.skillGaps).join(",")}`,
  });

  const placement = computePlacementHeuristic(analysis.metrics);
  checks.push({
    name: "Placement readiness heuristic",
    pass: placement.placementReadiness > 0 && !!placement.hiringProbability,
    detail: `score=${placement.placementReadiness} prob=${placement.hiringProbability}`,
  });

  try {
    checks.push({
      name: "CareerCoachGraph (LangGraph)",
      pass: !!buildCareerCoachGraph(),
      detail: "StateGraph compiled",
    });
  } catch (e) {
    checks.push({ name: "CareerCoachGraph", pass: false, detail: String(e) });
  }

  const pdf = createTextPdf("Test Report", [{ heading: "Summary", lines: ["Score: 75/100", "Placement: Moderate"] }]);
  checks.push({
    name: "PDF generation",
    pass: pdf.length > 100 && pdf.toString("utf8").startsWith("%PDF"),
    detail: `${pdf.length} bytes`,
  });

  try {
    const agent = AgentFactory.create("placement-readiness");
    const out = await agent.run({
      metrics: analysis.metrics,
    }, { userId: "verify-pr4" });
    const r = out.result as { placementReadiness: number; source: string };
    checks.push({
      name: "PlacementReadinessAgent",
      pass: r.source === "heuristic" && r.placementReadiness > 0,
      detail: `score=${r.placementReadiness}`,
    });
  } catch (e) {
    checks.push({ name: "PlacementReadinessAgent", pass: false, detail: String(e) });
  }

  console.log("\n=== PR-4 Career Coach Verification ===\n");
  let failed = 0;
  for (const c of checks) {
    console.log(`[${c.pass ? "PASS" : "FAIL"}] ${c.name}`);
    console.log(`       ${c.detail}\n`);
    if (!c.pass) failed++;
  }
  console.log(`Result: ${checks.length - failed}/${checks.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
