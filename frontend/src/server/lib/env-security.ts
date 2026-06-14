const WEAK_SECRET_PATTERNS = [
  /^change-me/i,
  /^dev-secret/i,
  /^your[-_]?secret/i,
  /^placeholder/i,
  /^test[-_]?secret/i,
];

const PLACEHOLDER_DB = /postgres:(YOUR_DB_PASSWORD|\[YOUR_PASSWORD\]|\[PROJECT_REF\])@/;

export interface EnvCheck {
  name: string;
  pass: boolean;
  severity: "critical" | "warning" | "info";
  detail: string;
}

function isWeakSecret(value: string | undefined): boolean {
  if (!value || value.length < 32) return true;
  return WEAK_SECRET_PATTERNS.some((re) => re.test(value));
}

export function auditEnvironment(isProduction = process.env.NODE_ENV === "production"): EnvCheck[] {
  const checks: EnvCheck[] = [];

  const jwt = process.env.JWT_SECRET;
  const nextAuth = process.env.NEXTAUTH_SECRET;
  const jwtWeak = isWeakSecret(jwt);
  const nextAuthWeak = isWeakSecret(nextAuth);

  checks.push({
    name: "JWT_SECRET",
    pass: !jwtWeak,
    severity: isProduction ? "critical" : "warning",
    detail: jwtWeak
      ? "Weak or missing — generate with: openssl rand -base64 48"
      : "Set and meets minimum length",
  });

  checks.push({
    name: "NEXTAUTH_SECRET",
    pass: !nextAuthWeak,
    severity: isProduction ? "critical" : "warning",
    detail: nextAuthWeak
      ? "Weak or missing — must differ from JWT_SECRET in production"
      : "Set and meets minimum length",
  });

  const dbUrl = process.env.DATABASE_URL || "";
  const directUrl = process.env.DIRECT_URL || "";
  const dbConfigured = Boolean(dbUrl && directUrl && !PLACEHOLDER_DB.test(dbUrl));
  checks.push({
    name: "DATABASE_URL / DIRECT_URL",
    pass: dbConfigured,
    severity: "critical",
    detail: dbConfigured ? `provider=${process.env.DATABASE_PROVIDER || "local"}` : "Missing or placeholder password",
  });

  if (process.env.DATABASE_PROVIDER === "supabase") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    checks.push({
      name: "Supabase public URL",
      pass: Boolean(supabaseUrl?.includes(".supabase.co")),
      severity: "critical",
      detail: supabaseUrl || "NEXT_PUBLIC_SUPABASE_URL not set",
    });
    checks.push({
      name: "Supabase anon key",
      pass: Boolean(anonKey && anonKey.length > 20),
      severity: "critical",
      detail: anonKey ? "Present (client-safe)" : "NEXT_PUBLIC_SUPABASE_ANON_KEY missing",
    });
    checks.push({
      name: "Supabase service role key",
      pass: Boolean(serviceKey && serviceKey.length > 20),
      severity: "warning",
      detail: serviceKey ? "Present (server-only)" : "SUPABASE_SERVICE_ROLE_KEY missing — needed for admin ops",
    });
  }

  const nextPublicApi = process.env.NEXT_PUBLIC_API_URL || "";
  if (isProduction) {
    checks.push({
      name: "NEXT_PUBLIC_API_URL",
      pass: !nextPublicApi.includes("localhost"),
      severity: "warning",
      detail: nextPublicApi || "Unset — browser uses same-origin /api",
    });
    checks.push({
      name: "NEXTAUTH_URL",
      pass: Boolean(process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")),
      severity: "warning",
      detail: process.env.NEXTAUTH_URL || "Set to production domain",
    });
  }

  checks.push({
    name: "OLLAMA_BASE_URL",
    pass: Boolean(process.env.OLLAMA_BASE_URL),
    severity: "info",
    detail: process.env.OLLAMA_BASE_URL || "http://localhost:11434 (default)",
  });

  if (isProduction) {
    checks.push({
      name: "JUDGE0_URL",
      pass: Boolean(process.env.JUDGE0_URL && !process.env.JUDGE0_URL.includes("localhost")),
      severity: "critical",
      detail: process.env.JUDGE0_URL || "Required in production",
    });
    checks.push({
      name: "REDIS_URL",
      pass: Boolean(process.env.REDIS_URL),
      severity: "warning",
      detail: process.env.REDIS_URL ? "Configured for cache/queues" : "Recommended for multi-instance ECS",
    });
    checks.push({
      name: "QDRANT_URL",
      pass: Boolean(process.env.QDRANT_URL),
      severity: "info",
      detail: process.env.QDRANT_URL ? "Semantic memory enabled" : "Optional — hash fallback disabled without Qdrant",
    });
    checks.push({
      name: "OTEL_EXPORTER_OTLP_ENDPOINT",
      pass: Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT),
      severity: "info",
      detail: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "Optional — structured logs always on",
    });
  }

  return checks;
}

export function envSecurityPassed(checks: EnvCheck[], production = false): boolean {
  const critical = checks.filter((c) => c.severity === "critical" && !c.pass);
  if (critical.length) return false;
  if (production) {
    const warnings = checks.filter((c) => c.severity === "warning" && !c.pass);
    if (warnings.some((w) => w.name.includes("JWT") || w.name.includes("NEXTAUTH"))) return false;
  }
  return true;
}
