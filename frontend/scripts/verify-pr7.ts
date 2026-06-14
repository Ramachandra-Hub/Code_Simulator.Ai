/**
 * PR-7 Voice Interview System verification
 * Run: npm run verify:pr7
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

import { prisma } from "../src/server/core/db/prisma";
import { analyzeVoiceDelivery } from "../src/server/career-intelligence/evaluators/voice-analysis-evaluator";
import { isVoiceInterviewType } from "../src/server/career-intelligence/services/voice-interview-service";
import { whisperAdapter } from "../src/server/core/voice/adapters/whisper-adapter";
import { ttsAdapter } from "../src/server/core/voice/adapters/tts-adapter";
import "../src/server/init";

type Check = { name: string; pass: boolean; detail: string };

function fileHas(path: string, needle: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(needle);
}

async function main() {
  const root = resolve(__dirname, "..");
  const checks: Check[] = [];

  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
  for (const model of ["VoiceInterviewSession", "VoiceTranscript", "VoiceMetrics", "VoiceFeedback"]) {
    checks.push({ name: `Prisma ${model}`, pass: schema.includes(`model ${model}`), detail: "voice persistence" });
  }

  checks.push({ name: "WhisperAdapter", pass: existsSync(resolve(root, "src/server/core/voice/adapters/whisper-adapter.ts")), detail: "STT adapter" });
  checks.push({ name: "TTSAdapter", pass: existsSync(resolve(root, "src/server/core/voice/adapters/tts-adapter.ts")), detail: "XTTS + browser fallback" });
  checks.push({ name: "VoiceInterviewAgent", pass: existsSync(resolve(root, "src/server/career-intelligence/agents/voice-interview-agent.ts")), detail: "audio flow coordinator" });
  checks.push({ name: "VoiceAnalysisAgent", pass: existsSync(resolve(root, "src/server/career-intelligence/agents/voice-analysis-agent.ts")), detail: "pace/filler/confidence" });

  for (const route of ["start", "stop", "transcript", "tts", "metrics"]) {
    checks.push({
      name: `API /api/voice/${route}`,
      pass: existsSync(resolve(root, `src/app/api/voice/${route}/route.ts`)),
      detail: "voice endpoint",
    });
  }

  checks.push({ name: "Voice interview UI page", pass: existsSync(resolve(root, "src/app/(dashboard)/interview/voice/page.tsx")), detail: "/interview/voice" });
  checks.push({ name: "Voice session component", pass: fileHas(resolve(root, "src/components/interview/voice-interview-session.tsx"), "VoiceWaveform"), detail: "mic + waveform + scores" });
  checks.push({ name: "Digital twin voice signal", pass: fileHas(resolve(root, "src/server/career-intelligence/memory/digital-twin.ts"), 'type === "voice"'), detail: "communication + confidence + speaking" });
  checks.push({ name: "PDF voice section", pass: fileHas(resolve(root, "src/server/career-intelligence/services/interview-pdf-service.ts"), "Voice Communication Analysis"), detail: "report enrichment" });
  checks.push({ name: "Interview graph integration", pass: fileHas(resolve(root, "src/server/career-intelligence/services/voice-interview-service.ts"), "submitAnswer"), detail: "uses existing Interview OS" });

  checks.push({ name: "Voice types: HR", pass: isVoiceInterviewType("hr"), detail: "supported" });
  checks.push({ name: "Voice types: technical", pass: isVoiceInterviewType("technical"), detail: "supported" });
  checks.push({ name: "Voice types: behavioral", pass: isVoiceInterviewType("behavioral"), detail: "supported" });
  checks.push({ name: "Voice types: system_design", pass: isVoiceInterviewType("system_design"), detail: "supported" });
  checks.push({ name: "Coding excluded from voice", pass: !isVoiceInterviewType("coding"), detail: "by design" });

  const analysis = analyzeVoiceDelivery({
    transcript: "Um, I worked on a project where, like, we built a scalable API.",
    audioDurationMs: 5000,
  });
  checks.push({
    name: "Voice analysis heuristic",
    pass: analysis.fillerCount >= 2 && analysis.wordsPerMinute > 0,
    detail: `${analysis.fillerCount} fillers, ${analysis.wordsPerMinute} WPM`,
  });

  const whisperOk = await whisperAdapter.isAvailable();
  const ttsOk = await ttsAdapter.isAvailable();
  checks.push({ name: "Whisper service", pass: true, detail: whisperOk ? "reachable" : "offline (browser STT fallback)" });
  checks.push({ name: "XTTS service", pass: true, detail: ttsOk ? "reachable" : "offline (browser TTS fallback)" });

  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('VoiceInterviewSession', 'VoiceTranscript', 'VoiceMetrics', 'VoiceFeedback')
    `;
    checks.push({ name: "Voice tables in DB", pass: tables.length >= 4, detail: `${tables.length}/4 tables` });
  } catch (err) {
    checks.push({ name: "Voice tables in DB", pass: false, detail: err instanceof Error ? err.message : "DB error" });
  }

  const passed = checks.filter((c) => c.pass).length;
  console.log("\n=== PR-7 Voice Interview Verification ===\n");
  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name}`);
    console.log(`  ${c.detail}\n`);
  }
  console.log(`Result: ${passed}/${checks.length} checks passed\n`);

  await prisma.$disconnect();
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
