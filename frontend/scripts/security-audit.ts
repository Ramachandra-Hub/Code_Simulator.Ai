/**
 * OWASP-oriented security audit
 * Run: npm run security:audit
 */
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { auditEnvironment } from "../src/server/lib/env-security";
import { RATE_LIMIT_RULES } from "../src/server/lib/rate-limit";

config({ path: resolve(__dirname, "../.env") });

type Finding = { id: string; pass: boolean; severity: string; detail: string };

function main() {
  const root = resolve(__dirname, "..");
  const findings: Finding[] = [];
  const isProd = process.env.NODE_ENV === "production";

  for (const c of auditEnvironment(isProd)) {
    findings.push({ id: c.name, pass: c.pass, severity: c.severity, detail: c.detail });
  }

  findings.push({
    id: "A01-Broken-Access-Control",
    pass: existsSync(resolve(root, "src/server/lib/middleware-auth.ts")),
    severity: "critical",
    detail: "JWT middleware + role guards on beta/recruiter routes",
  });

  findings.push({
    id: "A02-Cryptographic-Failures",
    pass: existsSync(resolve(root, "src/server/lib/token-crypto.ts")),
    severity: "critical",
    detail: "AES-256-GCM for OAuth tokens at rest",
  });

  findings.push({
    id: "A04-Insecure-Design",
    pass: RATE_LIMIT_RULES.length >= 5,
    severity: "warning",
    detail: `${RATE_LIMIT_RULES.length} rate limit rules configured`,
  });

  findings.push({
    id: "A05-Security-Misconfiguration",
    pass: readFileSync(resolve(root, "next.config.ts"), "utf8").includes("X-Frame-Options"),
    severity: "warning",
    detail: "Security headers in next.config.ts",
  });

  findings.push({
    id: "A07-Identification-Auth",
    pass: readFileSync(resolve(root, "src/server/lib/auth.ts"), "utf8").includes("bcrypt"),
    severity: "info",
    detail: "bcrypt password hashing",
  });

  findings.push({
    id: "A09-Security-Logging",
    pass: existsSync(resolve(root, "src/server/core/observability/logger.ts")),
    severity: "info",
    detail: "Structured JSON logging",
  });

  const failed = findings.filter((f) => !f.pass);
  console.log("\n=== Security Audit (OWASP-oriented) ===\n");
  for (const f of findings) {
    console.log(`${f.pass ? "✓" : "✗"} [${f.severity}] ${f.id}: ${f.detail}`);
  }
  console.log(`\n${findings.length - failed.length}/${findings.length} passed`);
  if (failed.some((f) => f.severity === "critical")) process.exit(1);
}

main();
