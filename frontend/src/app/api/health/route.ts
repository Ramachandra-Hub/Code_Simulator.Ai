import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db/prisma";
import { modelGateway } from "@/server/core/model/model-gateway";
import { judge0Client } from "@/server/career-intelligence/integrations/judge0-client";
import { redisHealthCheck } from "@/server/core/redis/redis-client";
import { qdrantClient } from "@/server/career-intelligence/integrations/qdrant-client";
import { getQueueStats } from "@/server/core/redis/queue-manager";
import { isOtelEnabled } from "@/server/core/observability/otel-config";

export async function GET() {
  let database: "connected" | "unavailable" = "unavailable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "unavailable";
  }

  const [providers, ollamaInfo, judge0Health, redis, qdrant, queues] = await Promise.all([
    modelGateway.getProviderStatus(),
    modelGateway.getOllamaInfo(),
    judge0Client.healthCheck(),
    redisHealthCheck(),
    qdrantClient.healthCheck(),
    getQueueStats(),
  ]);

  const requiredModels = [
    process.env.OLLAMA_MODEL || "qwen3:8b",
    process.env.OLLAMA_MODEL_REASONING || "deepseek-r1:8b",
  ];
  const installed = new Set(ollamaInfo.models);
  const modelsReady = requiredModels.every(
    (m) => installed.has(m) || [...installed].some((name) => name.startsWith(m.split(":")[0]))
  );

  const degraded =
    database !== "connected" ||
    !ollamaInfo.available ||
    (judge0Client.isProductionMode() && !judge0Health.available) ||
    (redis.configured && !redis.available);

  return NextResponse.json({
    status: degraded ? "degraded" : "ok",
    database,
    databaseProvider: process.env.DATABASE_PROVIDER || "local",
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
