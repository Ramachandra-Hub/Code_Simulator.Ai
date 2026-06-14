/**
 * PR-3 verification: Coding Interview Flow
 * Run: npm run verify:pr3
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import { getPrompt, listPrompts } from "../src/server/career-intelligence/prompts";
import { evaluateCodeHeuristic } from "../src/server/career-intelligence/evaluators/coding-evaluator";
import { buildCodingSubmitGraph } from "../src/server/career-intelligence/workflows/coding-interview-graph";
import { AgentFactory } from "../src/server/core/agent/agent-factory";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const checks: Check[] = [];

  checks.push({
    name: "PromptRegistry coding prompts",
    pass: listPrompts("coding").length >= 2,
    detail: listPrompts("coding").map((p) => p.id).join(", "),
  });

  try {
    const p = getPrompt("coding", "discussion", "v2");
    checks.push({ name: "getPrompt coding.discussion.v2", pass: p.structured === true, detail: p.id });
  } catch (e) {
    checks.push({ name: "getPrompt coding.discussion.v2", pass: false, detail: String(e) });
  }

  const mockJudge = {
    stdout: "PASS\n",
    stderr: null,
    status: { id: 3, description: "Accepted" },
    time: "0.05",
    memory: 1024,
    source: "judge0" as const,
  };
  const code = `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []`;
  const heuristic = evaluateCodeHeuristic(code, mockJudge, { title: "Two Sum", description: "...", difficulty: "easy", topics: ["hash-map"] });
  checks.push({
    name: "Heuristic scoring source of truth",
    pass: heuristic.source === "heuristic" && heuristic.overallScore > 0 && heuristic.correctnessScore >= 90,
    detail: `overall=${heuristic.overallScore} correctness=${heuristic.correctnessScore} time=${heuristic.timeComplexity}`,
  });

  try {
    const graph = buildCodingSubmitGraph();
    checks.push({ name: "CodingInterviewGraph (LangGraph)", pass: !!graph, detail: "StateGraph compiled" });
  } catch (e) {
    checks.push({ name: "CodingInterviewGraph (LangGraph)", pass: false, detail: String(e) });
  }

  try {
    const agent = AgentFactory.create("coding-evaluation");
    const out = await agent.run({ code, language: "python" }, { userId: "verify-pr3" });
    const r = out.result as { overallScore: number; source: string; passed: boolean };
    checks.push({
      name: "CodingEvaluationAgent",
      pass: r.source === "heuristic" && typeof r.overallScore === "number",
      detail: `overall=${r.overallScore} passed=${r.passed} source=${r.source}`,
    });
  } catch (e) {
    checks.push({ name: "CodingEvaluationAgent", pass: false, detail: String(e) });
  }

  console.log("\n=== PR-3 Coding Interview Verification ===\n");
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
