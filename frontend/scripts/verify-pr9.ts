/**
 * PR-9 Panel Interview Intelligence verification
 * Run: npm run verify:pr9
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { prisma } from "../src/server/core/db/prisma";
import { runPanelModerator } from "../src/server/career-intelligence/agents/panel-moderator-agent";
import { buildModeratorReport, evaluatePanelistTurn } from "../src/server/career-intelligence/evaluators/panel-evaluation-evaluator";
import { MNC_PANEL_ROSTER } from "../src/server/career-intelligence/panel/panel-personas";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

function fileHas(path: string, needle: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(needle);
}

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];

  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
  checks.push({ name: "PanelInterviewSession model", pass: schema.includes("model PanelInterviewSession"), detail: "panel persistence" });
  checks.push({ name: "PanelMember extended fields", pass: schema.includes("questioningStyle") && schema.includes("hiringRecommendation"), detail: "personas" });
  for (const field of ["executiveCommunication", "stakeholderManagement", "pressureHandling", "panelReadiness"]) {
    checks.push({ name: `Twin field ${field}`, pass: schema.includes(field), detail: "panel signals" });
  }

  const personas = ["hr", "technical_lead", "engineering_manager", "director", "recruiter"];
  for (const p of personas) {
    checks.push({
      name: `Persona ${p}`,
      pass: MNC_PANEL_ROSTER.some((m) => m.persona === p),
      detail: "MNC panel roster",
    });
  }

  for (const route of ["start", "answer", "transcript", "tts"]) {
    checks.push({
      name: `API /api/panel/${route}`,
      pass: existsSync(resolve(root, `src/app/api/panel/${route}/route.ts`)),
      detail: "endpoint",
    });
  }
  checks.push({ name: "API /api/panel/[id]", pass: existsSync(resolve(root, "src/app/api/panel/[id]/route.ts")), detail: "session state" });

  checks.push({ name: "PanelModeratorAgent", pass: existsSync(resolve(root, "src/server/career-intelligence/agents/panel-moderator-agent.ts")), detail: "turn order + interruptions" });
  checks.push({ name: "Panel interview service", pass: existsSync(resolve(root, "src/server/career-intelligence/services/panel-interview-service.ts")), detail: "orchestration" });
  checks.push({ name: "Panel graph", pass: existsSync(resolve(root, "src/server/career-intelligence/workflows/panel-graph.ts")), detail: "dynamic questioning" });
  checks.push({ name: "Panel UI page", pass: existsSync(resolve(root, "src/app/(dashboard)/interview/panel/page.tsx")), detail: "/interview/panel" });
  checks.push({ name: "Panel session component", pass: fileHas(resolve(root, "src/components/interview/panel-interview-session.tsx"), "Panel Roster"), detail: "roster + scores" });
  checks.push({ name: "Digital twin panel signal", pass: fileHas(resolve(root, "src/server/career-intelligence/memory/digital-twin.ts"), 'type === "panel"'), detail: "4 panel metrics" });
  checks.push({ name: "PDF panel section", pass: fileHas(resolve(root, "src/server/career-intelligence/services/interview-pdf-service.ts"), "Panel Member Feedback"), detail: "report enrichment" });
  checks.push({ name: "Voice per panelist", pass: MNC_PANEL_ROSTER.every((p) => Boolean(p.voiceId)), detail: "unique voiceId" });
  checks.push({ name: "panel.completed event", pass: fileHas(resolve(root, "src/server/core/events/agent-event-bus.ts"), "panel.completed"), detail: "event bus" });

  const mod = runPanelModerator({
    panel: MNC_PANEL_ROSTER.map((p, i) => ({
      id: `p${i}`,
      persona: p.persona,
      name: p.name,
      role: p.role,
      lastSpokeAt: null,
    })),
    answer: "I designed a microservices architecture with Kubernetes and CI/CD pipelines for our team.",
    answerScore: 75,
    turnCount: 2,
    maxTurns: 8,
    recentTranscript: [],
    targetRole: "Software Engineer",
  });
  checks.push({ name: "Moderator speaker selection", pass: Boolean(mod.nextSpeakerId), detail: mod.reason });

  const ev = evaluatePanelistTurn({
    panelistId: "p1",
    name: "Sarah Chen",
    role: "Technical Lead",
    persona: "technical_lead",
    answer: "We used Redis caching and horizontal scaling.",
    answerScores: { overall: 72, communication: 70, confidence: 68, technical: 80 },
    action: "challenge",
  });
  checks.push({ name: "Panelist evaluation", pass: ev.technicalScore > 0 && Boolean(ev.hiringRecommendation), detail: ev.hiringRecommendation });

  const report = buildModeratorReport([ev], [{ speaker: "Sarah", role: "ai" }], 1);
  checks.push({ name: "Moderator final report", pass: report.panelReadiness > 0 && report.strengths.length > 0, detail: `readiness=${report.panelReadiness}` });

  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'PanelInterviewSession'
    `;
    checks.push({ name: "PanelInterviewSession in DB", pass: tables.length >= 1, detail: "table exists" });
  } catch (err) {
    checks.push({ name: "PanelInterviewSession in DB", pass: false, detail: err instanceof Error ? err.message : "DB error" });
  }

  const passed = checks.filter((c) => c.pass).length;
  console.log("\n=== PR-9 Panel Interview Intelligence ===\n");
  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name} — ${c.detail}`);
  }
  console.log(`\n${passed}/${checks.length} checks passed\n`);
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
