const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";
const JUDGE0_REQUIRE =
  process.env.JUDGE0_REQUIRE !== undefined
    ? process.env.JUDGE0_REQUIRE === "true"
    : process.env.NODE_ENV === "production";

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  cpp: 54,
  c: 50,
  csharp: 51,
  sql: 82,
};

export interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
  source: "judge0" | "fallback";
}

export interface Judge0Health {
  available: boolean;
  url: string;
  productionMode: boolean;
  languageCount: number;
  latencyMs: number;
  version?: string;
}

export class Judge0UnavailableError extends Error {
  constructor(message = "Judge0 is required but unavailable") {
    super(message);
    this.name = "Judge0UnavailableError";
  }
}

class Judge0Client {
  private lastAvailability: boolean | null = null;
  private lastHealth: Judge0Health | null = null;

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (JUDGE0_API_KEY) {
      h["X-Auth-Token"] = JUDGE0_API_KEY;
      h["X-RapidAPI-Key"] = JUDGE0_API_KEY;
    }
    return h;
  }

  async isAvailable(): Promise<boolean> {
    const health = await this.healthCheck();
    return health.available;
  }

  async healthCheck(): Promise<Judge0Health> {
    const start = Date.now();
    try {
      const res = await fetch(`${JUDGE0_URL}/languages`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        this.lastAvailability = false;
        this.lastHealth = {
          available: false,
          url: JUDGE0_URL,
          productionMode: JUDGE0_REQUIRE,
          languageCount: 0,
          latencyMs,
        };
        return this.lastHealth;
      }
      const languages = (await res.json()) as unknown[];
      this.lastAvailability = true;
      this.lastHealth = {
        available: true,
        url: JUDGE0_URL,
        productionMode: JUDGE0_REQUIRE,
        languageCount: Array.isArray(languages) ? languages.length : 0,
        latencyMs,
        version: res.headers.get("x-judge0-version") || undefined,
      };
      return this.lastHealth;
    } catch {
      this.lastAvailability = false;
      this.lastHealth = {
        available: false,
        url: JUDGE0_URL,
        productionMode: JUDGE0_REQUIRE,
        languageCount: 0,
        latencyMs: Date.now() - start,
      };
      return this.lastHealth;
    }
  }

  getLastHealth(): Judge0Health | null {
    return this.lastHealth;
  }

  getLastAvailability(): boolean | null {
    return this.lastAvailability;
  }

  isProductionMode(): boolean {
    return JUDGE0_REQUIRE;
  }

  async submit(code: string, language: string, stdin?: string): Promise<Judge0Result> {
    const langId = LANGUAGE_IDS[language.toLowerCase()] || LANGUAGE_IDS.python;
    const health = await this.healthCheck();

    if (!health.available) {
      if (JUDGE0_REQUIRE) {
        throw new Judge0UnavailableError(`Judge0 unreachable at ${JUDGE0_URL}`);
      }
      return { ...this.mockEvaluate(code, language), source: "fallback" };
    }

    const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
        stdin: stdin || "",
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!createRes.ok) {
      if (JUDGE0_REQUIRE) {
        throw new Judge0UnavailableError(`Judge0 submission failed: HTTP ${createRes.status}`);
      }
      return { ...this.mockEvaluate(code, language), source: "fallback" };
    }

    const result = await createRes.json();
    return { ...result, source: "judge0" as const };
  }

  private mockEvaluate(code: string, _language: string): Omit<Judge0Result, "source"> {
    if (JUDGE0_REQUIRE) {
      throw new Judge0UnavailableError("Mock evaluation disabled in production");
    }
    const hasMain = code.length > 20;
    const hasReturn = /return|print|console\.log|System\.out/.test(code);
    return {
      stdout: hasMain && hasReturn ? "PASS\n" : null,
      stderr: hasMain ? null : "SyntaxError: incomplete code",
      status: { id: hasMain && hasReturn ? 3 : 6, description: hasMain && hasReturn ? "Accepted" : "Compilation Error" },
      time: "0.05",
      memory: 1024,
    };
  }
}

export const judge0Client = new Judge0Client();
