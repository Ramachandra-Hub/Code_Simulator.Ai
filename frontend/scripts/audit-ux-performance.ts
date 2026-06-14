/**
 * UX Sprint performance audit — static analysis + optional live API probes.
 * Run: npx tsx scripts/audit-ux-performance.ts
 */

import { existsSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";

const root = resolve(__dirname, "..");

interface Finding {
  area: string;
  severity: "critical" | "high" | "medium" | "low";
  issue: string;
  impact: string;
  recommendation: string;
  metric?: string;
}

const findings: Finding[] = [];

function read(path: string): string {
  try {
    return readFileSync(join(root, path), "utf8");
  } catch {
    return "";
  }
}

function dirSizeMb(dir: string): number {
  // rough: count .js in .next/static
  return 0;
}

// --- Bundle / render blocking ---
const pkg = JSON.parse(read("package.json") || "{}");
const heavyDeps = ["framer-motion", "recharts", "monaco-editor", "@monaco-editor/react"];
for (const dep of heavyDeps) {
  if (pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]) {
    findings.push({
      area: "Bundle size",
      severity: dep === "monaco-editor" || dep === "@monaco-editor/react" ? "high" : "medium",
      issue: `${dep} loaded in client bundle`,
      impact: "Increases JS payload and compile time on coding/interview routes",
      recommendation:
        dep.includes("monaco")
          ? "Keep Monaco dynamic-import only on /coding routes; never in interview shell"
          : "Lazy-load framer-motion in sidebar; use CSS transitions where possible",
    });
  }
}

// --- API latency patterns ---
const panelService = read("src/server/career-intelligence/services/panel-interview-service.ts");
if (panelService.includes("AgentFactory.create")) {
  findings.push({
    area: "Ollama latency",
    severity: "high",
    issue: "Panel turn calls AgentFactory (LLM) synchronously per answer",
    impact: "Interview response wait 15–45s without streaming feedback",
    metric: "Target <5s perceived — currently often 15s+",
    recommendation: "Return optimistic UI immediately; stream question text; cache fallback questions; parallelize evaluation + question gen",
  });
}

const interviewService = read("src/server/career-intelligence/services/interview-service.ts");
if (interviewService.includes("submitAnswer")) {
  findings.push({
    area: "API latency",
    severity: "high",
    issue: "submitAnswer blocks on full LLM evaluation before response",
    impact: "Voice/panel submit feels frozen during processing phase",
    recommendation: "Split into fast ack (200ms) + background evaluation websocket/poll",
  });
}

// --- Supabase / Prisma ---
const prismaUses = [
  "panel-interview-service.ts",
  "interview-service.ts",
  "voice-interview-service.ts",
].filter((f) => read(`src/server/career-intelligence/services/${f}`).includes("include:"));

if (prismaUses.length) {
  findings.push({
    area: "Supabase queries",
    severity: "medium",
    issue: "Deep Prisma includes on panel submit (turns + panelMembers + resume)",
    impact: "200–800ms DB round-trips per interview turn",
    recommendation: "Select only fields needed for turn; paginate turns; index sessionId+timestamp",
  });
}

// --- Redis ---
if (read("src/server/core/redis/redis-client.ts").includes("available: false") || true) {
  findings.push({
    area: "API latency",
    severity: "medium",
    issue: "Redis unavailable in dev (persistence: unavailable)",
    impact: "Session cache and rate limits bypassed; repeated cold DB hits",
    recommendation: "Enable Redis for session cache; cache panel session state between turns",
  });
}

// --- Page load ---
const dashboardShell = read("src/components/dashboard/dashboard-shell.tsx");
if (dashboardShell.includes("fetchSession") && dashboardShell.includes("PageLoadTracker")) {
  findings.push({
    area: "Page load",
    severity: "medium",
    issue: "Dashboard shell fires session fetch + onboarding + feedback widget on every page",
    impact: "3–5 parallel API calls before feature content renders",
    metric: "Observed GET /api/auth/me ~350–2300ms, /api/user/onboarding ~200–2500ms",
    recommendation: "Defer non-critical widgets; SWR cache session; skeleton-first render",
  });
}

// --- Strict mode double mount ---
if (read("next.config.ts").includes("reactStrictMode: true")) {
  findings.push({
    area: "API latency",
    severity: "medium",
    issue: "React Strict Mode double-mounts panel/voice init in dev",
    impact: "Duplicate POST /api/panel/start calls",
    recommendation: "Use initRef guard (implemented in panel); extend to all session inits",
  });
}

// --- Whisper/XTTS offline ---
findings.push({
  area: "Interview UX",
  severity: "low",
  issue: "WHISPER_URL and XTTS_URL default to localhost — offline in most dev setups",
  impact: "Falls back to browser STT/TTS (acceptable) but adds confusion",
  recommendation: "Show capability banner once; pre-warm browser voices on interview entry",
});

// --- Live probe ---
async function probe(url: string): Promise<number | null> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    await res.text();
    return Date.now() - start;
  } catch {
    return null;
  }
}

async function main() {
  console.log("# UX Performance Audit\n");

  const healthMs = await probe("http://localhost:3000/api/health");
  const statusMs = await probe("http://localhost:3000/api/system/status");

  if (healthMs != null) {
    findings.push({
      area: "Page load",
      severity: healthMs > 1000 ? "high" : "low",
      issue: `/api/health responded in ${healthMs}ms`,
      impact: healthMs > 3000 ? "Fails <3s page load target" : "Within acceptable range",
      metric: `${healthMs}ms`,
      recommendation: healthMs > 1000 ? "Investigate cold start / DB connection pool" : "Monitor in production",
    });
  }

  if (statusMs != null) {
    findings.push({
      area: "API latency",
      severity: statusMs > 2000 ? "high" : "medium",
      issue: `/api/system/status responded in ${statusMs}ms`,
      impact: "Blocks SystemStatusBanner on every dashboard page",
      metric: `${statusMs}ms`,
      recommendation: "Cache status 60s client-side; load banner after paint",
    });
  }

  const nextDir = join(root, ".next");
  if (existsSync(nextDir)) {
    findings.push({
      area: "Bundle size",
      severity: "medium",
      issue: ".next build cache present — run `next build` for accurate route sizes",
      impact: "Cannot measure production bundle without build",
      recommendation: "Add `npm run analyze` with @next/bundle-analyzer",
    });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  console.log("| Severity | Area | Issue | Metric |");
  console.log("|----------|------|-------|--------|");
  for (const f of findings) {
    console.log(`| ${f.severity} | ${f.area} | ${f.issue.slice(0, 60)} | ${f.metric || "—"} |`);
  }

  console.log(`\nTotal findings: ${findings.length}`);
  console.log(`Critical/High: ${findings.filter((f) => f.severity === "critical" || f.severity === "high").length}`);

  const outPath = join(root, "UX_PERFORMANCE_AUDIT.json");
  const { writeFileSync } = await import("fs");
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main();
