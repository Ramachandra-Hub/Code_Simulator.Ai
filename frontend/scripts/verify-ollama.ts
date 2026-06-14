/**
 * PR-1 verification: Ollama + ModelGateway
 * Run: npm run verify:ollama
 */
import { OllamaAdapter } from "../src/server/core/model/adapters/ollama-adapter";
import { modelGateway } from "../src/server/core/model/model-gateway";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const REQUIRED = [
  process.env.OLLAMA_MODEL || "qwen3:8b",
  process.env.OLLAMA_MODEL_REASONING || "deepseek-r1:8b",
];

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const checks: Check[] = [];

  // 1. Ollama API reachable
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    checks.push({
      name: "Ollama API reachable",
      pass: res.ok,
      detail: res.ok ? OLLAMA_URL : `HTTP ${res.status}`,
    });
  } catch (err) {
    checks.push({
      name: "Ollama API reachable",
      pass: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Adapter isAvailable
  const adapter = new OllamaAdapter();
  const available = await adapter.isAvailable();
  checks.push({
    name: "OllamaAdapter.isAvailable()",
    pass: available,
    detail: available ? "true" : "false",
  });

  // 3. Models installed
  const models = available ? await adapter.listModels() : [];
  for (const required of REQUIRED) {
    const found = models.some((m) => m === required || m.startsWith(required.split(":")[0] + ":"));
    checks.push({
      name: `Model installed: ${required}`,
      pass: found,
      detail: found ? "found" : `missing — run: ollama pull ${required}`,
    });
  }

  // 4. ModelGateway provider status
  const providers = await modelGateway.getProviderStatus();
  checks.push({
    name: "ModelGateway ollama provider",
    pass: providers.ollama === true,
    detail: JSON.stringify(providers),
  });

  // 5. ModelGateway complete (only if default model available)
  const defaultModel = process.env.OLLAMA_MODEL || "qwen3:8b";
  const hasDefault = models.some((m) => m === defaultModel || m.includes(defaultModel.split(":")[0]));
  if (hasDefault && providers.ollama) {
    try {
      const response = await modelGateway.complete({
        prompt: "Reply with exactly one word: OK",
        system: "You are a test assistant. Be brief.",
        maxTokens: 16,
        temperature: 0,
      });
      const pass = response.text.length > 0 && response.model.includes(defaultModel.split(":")[0]) || response.text.length > 0;
      checks.push({
        name: "ModelGateway.complete() via Ollama",
        pass,
        detail: `model=${response.model} latency=${response.latencyMs}ms text="${response.text.slice(0, 80)}"`,
      });
    } catch (err) {
      checks.push({
        name: "ModelGateway.complete() via Ollama",
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    checks.push({
      name: "ModelGateway.complete() via Ollama",
      pass: false,
      detail: `skipped — pull ${defaultModel} first`,
    });
  }

  // 6. Active provider
  checks.push({
    name: "MODEL_PROVIDER=ollama",
    pass: (process.env.MODEL_PROVIDER || "ollama") === "ollama",
    detail: process.env.MODEL_PROVIDER || "ollama (default)",
  });

  console.log("\n=== PR-1 Ollama Verification ===\n");
  let failed = 0;
  for (const c of checks) {
    const icon = c.pass ? "PASS" : "FAIL";
    console.log(`[${icon}] ${c.name}`);
    console.log(`       ${c.detail}\n`);
    if (!c.pass) failed++;
  }

  console.log(`Result: ${checks.length - failed}/${checks.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
