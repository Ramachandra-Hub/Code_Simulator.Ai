import { prisma } from "../core/db/prisma";

export type ErrorSource = "api" | "ollama" | "prisma" | "client";

export async function logSystemError(input: {
  source: ErrorSource;
  message: string;
  route?: string;
  method?: string;
  statusCode?: number;
  stack?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.systemError.create({
      data: {
        source: input.source,
        route: input.route,
        method: input.method,
        statusCode: input.statusCode,
        message: input.message.slice(0, 4000),
        stack: input.stack?.slice(0, 8000),
        userId: input.userId,
        metadata: input.metadata as object | undefined,
      },
    });
  } catch {
    // non-blocking — never break the request path for logging
  }
}

export function logApiError(
  route: string,
  err: unknown,
  opts?: { method?: string; statusCode?: number; userId?: string }
) {
  const message = err instanceof Error ? err.message : String(err);
  void logSystemError({
    source: "api",
    route,
    method: opts?.method,
    statusCode: opts?.statusCode ?? 500,
    message,
    stack: err instanceof Error ? err.stack : undefined,
    userId: opts?.userId,
  });
}

export function logOllamaError(route: string, err: unknown, metadata?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  void logSystemError({
    source: "ollama",
    route,
    message,
    stack: err instanceof Error ? err.stack : undefined,
    metadata,
  });
}

export function logPrismaError(operation: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  void logSystemError({
    source: "prisma",
    route: operation,
    message,
    stack: err instanceof Error ? err.stack : undefined,
  });
}
