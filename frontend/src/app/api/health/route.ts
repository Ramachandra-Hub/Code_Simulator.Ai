import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db/prisma";
import { modelGateway } from "@/server/core/model/model-gateway";
import { judge0Client } from "@/server/career-intelligence/integrations/judge0-client";
import { redisHealthCheck } from "@/server/core/redis/redis-client";
import { qdrantClient } from "@/server/career-intelligence/integrations/qdrant-client";
import { getQueueStats } from "@/server/core/redis/queue-manager";
import { isOtelEnabled } from "@/server/core/observability/otel-config";
import { getDatabaseConfigError } from "@/server/lib/db-config";

function safeDatabaseUrlHint(): { host: string | null; user: string | null; passwordLength: number | null } {
  const url = process.env.DATABASE_URL || "";
  const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^/?]+)/);
  return {
    user: match?.[1] ?? null,
    host: match?.[3] ?? null,
    passwordLength: match?.[2]?.length ?? null,
  };
}

export async function GET() {
  const configError = getDatabaseConfigError();
  let database: "connected" | "unavailable" = "unavailable";
  let databaseError: string | null = configError;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
    databaseError = null;
  } catch (err) {
    databaseError = err instanceof Error ? err.message : "Database connection failed";
  }

  const [providers, ai, judge0Health, redis, qdrant, queues] = await Promise.all([
    modelGateway.getProviderStatus(),
    modelGateway.getAiServiceStatus(),
    judge0Client.healthCheck(),
    redisHealthCheck(),
    qdrantClient.healthCheck(),
    getQueueStats(),
  ]);

  const requiredModels = [
    process.env.OLLAMA_MODEL || "qwen3:8b",
    process.env.OLLAMA_MODEL_REASONING || "deepseek-r1:8b",
  ];
  const ollamaInfo = await modelGateway.getOllamaInfo();
  const installed = new Set(ollamaInfo.models);
  const modelsReady =
    modelGateway.getActiveProvider() === "heuristic" ||
    requiredModels.every(
      (m) => installed.has(m) || [...installed].some((name) => name.startsWith(m.split(":")[0]))
    );

  const degraded =
    database !== "connected" ||
    !ai.online ||
    (judge0Client.isProductionMode() && !judge0Health.available) ||
    (redis.configured && !redis.available);

  return NextResponse.json({
    status: degraded ? "degraded" : "ok",
    database,
    databaseProvider: process.env.DATABASE_PROVIDER || "local",
    databaseConfig: {
      configured: !configError,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
      ...safeDatabaseUrlHint(),
      error: configError || databaseError,
    },
    model: {
      activeProvider: modelGateway.getActiveProvider(),
      providers,
      ollamaReady: ollamaInfo.available,
      ollamaBaseUrl: ollamaInfo.baseUrl,
      defaultModel: ollamaInfo.defaultModel,
      reasoningModel: process.env.OLLAMA_MODEL_REASONING || "deepseek-r1:8b",
      installedModels: ollamaInfo.models,
      requiredModels,
      modelsReady,
    },
    judge0: judge0Health,
    redis: { ...redis, queues },
    qdrant,
    observability: {
      openTelemetry: isOtelEnabled(),
      structuredLogs: true,
      endpoints: { live: "/api/health/live", ready: "/api/health/ready" },
    },
    timestamp: new Date().toISOString(),
  });
}
