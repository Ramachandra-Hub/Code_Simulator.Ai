/**
 * Push local frontend/.env values to Vercel project environment variables.
 *
 * Prerequisites:
 *   1. vercel login   (or set VERCEL_TOKEN)
 *   2. From frontend/: npm run env:sync-vercel
 *
 * Never commit .env — this script reads it locally only.
 */
import { existsSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";

const ROOT = path.join(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env");
const PROJECT = process.env.VERCEL_PROJECT || "code-simulator-ai";
const PROD_URL = process.env.VERCEL_PROD_URL || "https://code-simulator-ai.vercel.app";
const TARGETS = (process.env.VERCEL_ENV_TARGETS || "production,preview,development")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const SENSITIVE = new Set([
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "NEXTAUTH_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GITHUB_CLIENT_SECRET",
  "LINKEDIN_CLIENT_SECRET",
  "JUDGE0_API_KEY",
  "QDRANT_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "INTEGRATION_ENCRYPTION_KEY",
]);

const SKIP_KEYS = new Set(["NODE_ENV"]);

function parseEnv(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function toSupabasePoolerUrl(url: string): string {
  if (!url.includes("supabase.co") || !url.includes(":5432")) return url;
  let pooled = url.replace(":5432/", ":6543/");
  if (!pooled.includes("pgbouncer=true")) {
    pooled += pooled.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }
  return pooled;
}

function applyVercelOverrides(vars: Record<string, string>): Record<string, string> {
  const out = { ...vars };
  out.DATABASE_PROVIDER = out.DATABASE_PROVIDER || "supabase";
  out.NEXTAUTH_URL = PROD_URL;
  out.ALLOW_DEMO_USERS = "true";
  out.JUDGE0_REQUIRE = "false";
  if (out.DATABASE_URL) {
    out.DATABASE_URL = toSupabasePoolerUrl(out.DATABASE_URL);
  }
  delete out.NEXT_PUBLIC_API_URL;
  return out;
}

function runVercel(args: string[]): boolean {
  const result = spawnSync("npx", ["vercel", ...args], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return result.status === 0;
}

function ensureLinked(): boolean {
  const vercelDir = path.join(ROOT, ".vercel");
  if (existsSync(path.join(vercelDir, "project.json"))) return true;
  console.log(`Linking to Vercel project "${PROJECT}"...`);
  return runVercel(["link", "--yes", "--project", PROJECT]);
}

function addEnv(key: string, value: string, target: string): boolean {
  const args = ["env", "add", key, target, "--value", value, "--yes", "--force"];
  if (SENSITIVE.has(key)) args.push("--sensitive");
  return runVercel(args);
}

function main(): void {
  if (!existsSync(ENV_FILE)) {
    console.error(`Missing ${ENV_FILE}. Copy .env.example and fill values first.`);
    process.exit(1);
  }

  if (!runVercel(["whoami"])) {
    console.error("\nNot logged in to Vercel. Run: npx vercel login");
    console.error("Or set VERCEL_TOKEN from https://vercel.com/account/tokens\n");
    process.exit(1);
  }

  if (!ensureLinked()) {
    console.error("Failed to link Vercel project.");
    process.exit(1);
  }

  const raw = parseEnv(readFileSync(ENV_FILE, "utf8"));
  const vars = applyVercelOverrides(raw);
  const keys = Object.keys(vars).filter((k) => !SKIP_KEYS.has(k) && vars[k] !== "");

  console.log(`\nSyncing ${keys.length} variables to Vercel (${TARGETS.join(", ")})...\n`);

  let ok = 0;
  let fail = 0;
  for (const target of TARGETS) {
    console.log(`--- ${target} ---`);
    for (const key of keys) {
      process.stdout.write(`  ${key} ... `);
      if (addEnv(key, vars[key], target)) {
        console.log("ok");
        ok++;
      } else {
        console.log("FAILED");
        fail++;
      }
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed.`);
  console.log("Redeploy on Vercel for changes to take effect.");
  if (fail > 0) process.exit(1);
}

main();
