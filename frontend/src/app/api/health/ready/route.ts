import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db/prisma";
import { judge0Client } from "@/server/career-intelligence/integrations/judge0-client";
import { redisHealthCheck } from "@/server/core/redis/redis-client";
import { qdrantClient } from "@/server/career-intelligence/integrations/qdrant-client";
import { modelGateway } from "@/server/core/model/model-gateway";

/** Readiness probe — dependencies required to serve traffic */
export async function GET() {
  const isProd = process.env.NODE_ENV === "production";

  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const [judge0, redis, qdrant, ollamaInfo] = await Promise.all([
    judge0Client.healthCheck(),
    redisHealthCheck(),
    qdrantClient.healthCheck(),
    modelGateway.getOllamaInfo(),
  ]);

  const judge0Ok = !isProd || judge0.available;
  const redisOk = !redis.configured || redis.available;
  const qdrantOk = !qdrant.configured || qdrant.available;
  const aiOk = ollamaInfo.available;

  const ready = database && judge0Ok && redisOk && aiOk;

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: { database, judge0: judge0.available, redis: redis.available, qdrant: qdrant.available, ollama: aiOk },
      qdrantOk,
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 }
  );
}
