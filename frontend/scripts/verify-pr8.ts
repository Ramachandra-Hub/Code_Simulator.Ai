/**
 * PR-8 Professional Profile Intelligence verification
 * Run: npm run verify:pr8
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { prisma } from "../src/server/core/db/prisma";
import {
  analyzeGitHubProfile,
  analyzeLeetCodeStats,
  analyzeLinkedInProfile,
  computeProfessionalReadiness,
  scoreReadme,
} from "../src/server/career-intelligence/evaluators/professional-profile-evaluator";
import { encryptToken, decryptToken } from "../src/server/lib/token-crypto";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

function fileHas(path: string, needle: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(needle);
}

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];

  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
  for (const field of ["githubScore", "linkedinScore", "leetcodeScore", "professionalReadiness", "portfolioStrength"]) {
    checks.push({ name: `Profile field ${field}`, pass: schema.includes(field), detail: "StudentIntelligenceProfile" });
  }

  for (const route of [
    "integrations/status",
    "integrations/github/authorize",
    "integrations/github/callback",
    "integrations/linkedin/authorize",
    "integrations/linkedin/callback",
    "integrations/leetcode",
    "integrations/hackerrank",
    "professional-intelligence",
  ]) {
    checks.push({
      name: `API /api/${route}`,
      pass: existsSync(resolve(root, `src/app/api/${route}/route.ts`)),
      detail: "route exists",
    });
  }

  checks.push({ name: "Token encryption", pass: existsSync(resolve(root, "src/server/lib/token-crypto.ts")), detail: "AES-256-GCM" });
  const plain = "test-oauth-token-12345";
  const enc = encryptToken(plain);
  checks.push({ name: "Encrypt/decrypt roundtrip", pass: decryptToken(enc) === plain, detail: "secure storage" });

  checks.push({ name: "GitHub intelligence evaluator", pass: existsSync(resolve(root, "src/server/career-intelligence/evaluators/professional-profile-evaluator.ts")), detail: "repo/readme/architecture scoring" });
  checks.push({ name: "LeetCode client", pass: existsSync(resolve(root, "src/server/career-intelligence/integrations/leetcode-client.ts")), detail: "GraphQL" });
  checks.push({ name: "HackerRank client", pass: existsSync(resolve(root, "src/server/career-intelligence/integrations/hackerrank-client.ts")), detail: "REST profile" });
  checks.push({ name: "Profile integration service", pass: existsSync(resolve(root, "src/server/career-intelligence/services/profile-integration-service.ts")), detail: "sync + persist" });
  checks.push({ name: "Professional dashboard UI", pass: existsSync(resolve(root, "src/app/(dashboard)/dashboard/professional-intelligence/page.tsx")), detail: "/dashboard/professional-intelligence" });

  checks.push({ name: "Digital twin github signal", pass: fileHas(resolve(root, "src/server/career-intelligence/memory/digital-twin.ts"), 'type === "github"'), detail: "githubScore" });
  checks.push({ name: "Digital twin linkedin signal", pass: fileHas(resolve(root, "src/server/career-intelligence/memory/digital-twin.ts"), 'type === "linkedin"'), detail: "linkedinScore" });
  checks.push({ name: "Digital twin leetcode signal", pass: fileHas(resolve(root, "src/server/career-intelligence/memory/digital-twin.ts"), 'type === "leetcode"'), detail: "algorithm + problem solving" });
  checks.push({ name: "Digital twin hackerrank signal", pass: fileHas(resolve(root, "src/server/career-intelligence/memory/digital-twin.ts"), 'type === "hackerrank"'), detail: "coding readiness" });
  checks.push({ name: "Career coach professional scores", pass: fileHas(resolve(root, "src/server/career-intelligence/services/career-coach-service.ts"), "leetcodeSummary"), detail: "coach context" });
  checks.push({ name: "Placement professional weight", pass: fileHas(resolve(root, "src/server/career-intelligence/evaluators/career-metrics.ts"), "professionalReadiness"), detail: "readiness integration" });

  const gh = analyzeGitHubProfile({
    username: "dev",
    publicRepos: 10,
    repos: [{ name: "api", description: "REST microservice", stars: 8, forks: 2, language: "TypeScript", readme: "# API\n## Install\n```bash\nnpm i```", hasTests: true }],
    languages: { TypeScript: 5 },
    totalStars: 8,
    totalForks: 2,
    totalCommits: 200,
    followers: 20,
  });
  checks.push({ name: "GitHub score heuristic", pass: gh.score > 40 && gh.strengths.length > 0, detail: `score=${gh.score}` });

  const li = analyzeLinkedInProfile({
    headline: "Full Stack Engineer",
    experience: [{ title: "Intern", company: "Co" }],
    skills: ["React", "Node", "SQL", "AWS", "Docker", "K8s"],
    projects: [{ name: "App" }],
    certifications: [{ name: "AWS" }],
    recommendations: [{ text: "Great" }],
  });
  checks.push({ name: "LinkedIn score heuristic", pass: li.score > 50, detail: `score=${li.score}` });

  const lc = analyzeLeetCodeStats({ username: "user", easy: 50, medium: 40, hard: 10, solved: 100, topics: { Array: 20 } });
  checks.push({ name: "LeetCode score heuristic", pass: lc.codingReadiness > 0 && lc.algorithmSkills > 0, detail: `readiness=${lc.codingReadiness}` });

  const prof = computeProfessionalReadiness({ github: 70, linkedin: 60, leetcode: 80, hackerrank: 50 });
  checks.push({ name: "Professional readiness composite", pass: prof.professionalReadiness > 50 && prof.portfolioStrength > 0, detail: `prof=${prof.professionalReadiness}` });

  checks.push({ name: "README quality scorer", pass: scoreReadme("# Title\n## Usage\n```js\n```") > 50, detail: "documentation signal" });

  try {
    await prisma.$queryRaw`SELECT 1`;
    const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'StudentIntelligenceProfile'
      AND column_name IN ('githubScore', 'professionalReadiness')
    `;
    checks.push({ name: "DB profile columns", pass: cols.length >= 2, detail: `${cols.length}/2 PR-8 columns` });
  } catch (err) {
    checks.push({ name: "DB profile columns", pass: false, detail: err instanceof Error ? err.message : "DB error" });
  }

  const passed = checks.filter((c) => c.pass).length;
  console.log("\n=== PR-8 Professional Profile Intelligence ===\n");
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
