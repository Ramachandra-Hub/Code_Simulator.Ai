/**
 * PR-2 verification: PromptRegistry + upgraded agents
 * Run: npm run verify:pr2
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import { getPrompt, renderPrompt, listPrompts, promptRegistry } from "../src/server/career-intelligence/prompts";
import { parseStructuredResponse } from "../src/server/career-intelligence/prompts/json-utils";
import { QuestionGenerationSchema } from "../src/server/career-intelligence/prompts/schemas";
import { AgentFactory } from "../src/server/core/agent/agent-factory";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const checks: Check[] = [];

  checks.push({
    name: "PromptRegistry loaded",
    pass: promptRegistry.length >= 8,
    detail: `${promptRegistry.length} prompts registered`,
  });

  try {
    const q = getPrompt("technical", "question-generation", "v2");
    const rendered = renderPrompt(q, { interviewType: "technical", targetRole: "SDE", difficulty: "medium", skills: "[]", resumeContext: "{}", asked: "[]" });
    checks.push({
      name: "renderPrompt v2 question-generation",
      pass: rendered.user.includes("JSON") && rendered.system.length > 10,
      detail: `system=${rendered.system.length}chars user=${rendered.user.length}chars`,
    });
  } catch (e) {
    checks.push({ name: "renderPrompt v2 question-generation", pass: false, detail: String(e) });
  }

  const jsonSample = '```json\n{"question":"Explain REST vs GraphQL for a backend role.","difficulty":"medium","rationale":"tests API knowledge"}\n```';
  const parsed = parseStructuredResponse(jsonSample, QuestionGenerationSchema, { question: "", difficulty: "medium" });
  checks.push({
    name: "JSON parse + Zod validation",
    pass: parsed.valid && parsed.data.question.includes("REST"),
    detail: parsed.source,
  });

  const badJson = parseStructuredResponse("not json", QuestionGenerationSchema, { question: "fallback", difficulty: "easy" });
  checks.push({
    name: "JSON fallback on invalid",
    pass: !badJson.valid && badJson.data.question === "fallback",
    detail: badJson.source,
  });

  checks.push({
    name: "PROMPT_VERSION",
    pass: (process.env.PROMPT_VERSION || "v2") === "v2",
    detail: process.env.PROMPT_VERSION || "v2 (default)",
  });

  // Agent smoke tests (require Ollama + qwen3:8b)
  try {
    const qg = AgentFactory.create("question-generation");
    const qOut = await qg.run(
      { type: "technical", context: { targetRole: "Backend Engineer", skills: ["Node.js"], difficulty: "medium" }, asked: [], bank: ["Fallback bank question?"] },
      { userId: "verify-pr2" }
    );
    const qResult = qOut.result as { question: string; source: string };
    checks.push({
      name: "QuestionGenerationAgent",
      pass: !!qResult.question && qResult.question.length > 10,
      detail: `source=${qResult.source} q="${qResult.question.slice(0, 60)}..."`,
    });
  } catch (e) {
    checks.push({ name: "QuestionGenerationAgent", pass: false, detail: String(e) });
  }

  try {
    const ra = AgentFactory.create("response-analysis");
    const rOut = await ra.run(
      { question: "Explain your project.", answer: "Our team did a group project and it was successful.", keywords: ["React"], type: "technical" },
      { userId: "verify-pr2" }
    );
    const rResult = rOut.result as { answerType: string; scores: { overall: number }; source?: string };
    checks.push({
      name: "ResponseAnalysisAgent heuristic truth",
      pass: rResult.answerType === "team_ownership" && rResult.scores.overall > 0,
      detail: `type=${rResult.answerType} overall=${rResult.scores.overall} source=${rResult.source}`,
    });
  } catch (e) {
    checks.push({ name: "ResponseAnalysisAgent", pass: false, detail: String(e) });
  }

  try {
    const ev = AgentFactory.create("evaluation");
    const eOut = await ev.run({
      answers: [
        { scores: { overall: 72, relevance: 70, depth: 75, communication: 68, confidence: 65 }, answerType: "partial" },
        { scores: { overall: 80, relevance: 82, depth: 78, communication: 75, confidence: 70 }, answerType: "strong" },
      ],
    }, { userId: "verify-pr2" });
    const eResult = eOut.result as { overallScore: number; summary: string; source: string };
    checks.push({
      name: "EvaluationAgent heuristic overallScore",
      pass: eResult.overallScore === 76,
      detail: `overall=${eResult.overallScore} source=${eResult.source}`,
    });
  } catch (e) {
    checks.push({ name: "EvaluationAgent", pass: false, detail: String(e) });
  }

  console.log("\n=== PR-2 Prompt & Agent Verification ===\n");
  let failed = 0;
  for (const c of checks) {
    console.log(`[${c.pass ? "PASS" : "FAIL"}] ${c.name}`);
    console.log(`       ${c.detail}\n`);
    if (!c.pass) failed++;
  }
  console.log(`Result: ${checks.length - failed}/${checks.length} passed\n`);
  console.log("Registered prompts:", listPrompts().map((p) => p.id).join(", "));
  process.exit(failed > 0 ? 1 : 0);
}

main();
