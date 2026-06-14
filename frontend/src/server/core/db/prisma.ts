import { PrismaClient } from "@prisma/client";
import { getDatabaseConfigError } from "../../lib/db-config";

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient | undefined };

/** Active backend: supabase (testing) | local | aws-rds — set via DATABASE_PROVIDER in .env */
export const databaseProvider = process.env.DATABASE_PROVIDER || "local";

function withConnectionLimit(url: string | undefined): string | undefined {
  if (!url || url.includes("connection_limit=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  const limit = process.env.VERCEL ? "1" : "5";
  return `${url}${sep}connection_limit=${limit}`;
}

function resolveDatabaseUrl(): string {
  const configError = getDatabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }
  return withConnectionLimit(process.env.DATABASE_URL)!;
}

const METRIC_MODELS = new Set(["PerformanceMetric", "SystemError"]);

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: { url: resolveDatabaseUrl() },
    },
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (METRIC_MODELS.has(model)) {
            return query(args);
          }
          const start = Date.now();
          const op = `${model}.${operation}`;
          try {
            return await query(args);
          } catch (err) {
            const { logPrismaError } = await import("../../beta/system-error-service");
            logPrismaError(op, err);
            throw err;
          } finally {
            const { recordPerformanceMetric } = await import("../../beta/performance-service");
            void recordPerformanceMetric({
              category: "database",
              route: op,
              durationMs: Date.now() - start,
            });
          }
        },
      },
    },
  });
}

/** Recreate client when schema added new models but dev server kept a stale singleton. */
function isStalePrismaClient(client: ExtendedPrismaClient | undefined): boolean {
  if (!client) return true;
  const c = client as ExtendedPrismaClient & {
    userOnboarding?: unknown;
    usageEvent?: unknown;
    questionEffectiveness?: unknown;
    intelligenceImprovementReport?: unknown;
    systemError?: unknown;
    voiceInterviewSession?: unknown;
  };
  return !c.userOnboarding || !c.usageEvent || !c.questionEffectiveness || !c.systemError || !c.voiceInterviewSession;
}

let prismaClient: ExtendedPrismaClient | undefined;

function getPrismaClient(): ExtendedPrismaClient {
  const cached = process.env.NODE_ENV !== "production" ? globalForPrisma.prisma : undefined;
  if (!prismaClient && cached && !isStalePrismaClient(cached)) {
    prismaClient = cached;
  }
  if (!prismaClient || isStalePrismaClient(prismaClient)) {
    prismaClient = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaClient;
    }
  }
  return prismaClient;
}

/** Lazy singleton — avoids connecting to the database during `next build` on Vercel. */
export const prisma: ExtendedPrismaClient = new Proxy({} as ExtendedPrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
