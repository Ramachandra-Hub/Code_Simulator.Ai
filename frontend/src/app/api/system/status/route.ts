import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db/prisma";
import { modelGateway } from "@/server/core/model/model-gateway";
import { judge0Client } from "@/server/career-intelligence/integrations/judge0-client";
import { getDatabaseConfigError } from "@/server/lib/db-config";

export async function GET() {
  const configError = getDatabaseConfigError();
  let database: "connected" | "unavailable" | "misconfigured" = "unavailable";
  if (configError) {
    database = "misconfigured";
  } else {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
    } catch {
      database = "unavailable";
    }
  }

  const [ai, judge0Available] = await Promise.all([
    modelGateway.getAiServiceStatus(),
    judge0Client.isAvailable(),
  ]);

  const ollama = ai.online ? "online" : "offline";
  const judge0 = judge0Available ? "online" : judge0Client.isProductionMode() ? "required_offline" : "offline_dev_ok";

  const degraded = database !== "connected" || !ai.online;

  return NextResponse.json({
    status: degraded ? "degraded" : "ok",
    services: {
      database: { status: database, message: configError || (database === "connected" ? "Connected" : "Cannot reach Supabase") },
      ollama: {
        status: ollama,
        message: ai.message,
        model:
          (process.env.MODEL_PROVIDER || "").toLowerCase() === "openai"
            ? process.env.OPENAI_MODEL || "gpt-4o-mini"
            : process.env.OLLAMA_MODEL || "qwen3:8b",
        provider: ai.provider,
      },
      judge0: {
        status: judge0,
        message:
          judge0 === "online"
            ? "Code execution ready"
            : judge0 === "required_offline"
              ? "Judge0 required in production but unreachable"
              : "Judge0 offline — coding uses dev fallback",
      },
    },
    timestamp: new Date().toISOString(),
  });
}
