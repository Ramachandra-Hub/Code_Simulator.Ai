import { randomUUID } from "crypto";
import { logger } from "./logger";
import { prisma } from "../db/prisma";

const TRACE_HEADER = "x-trace-id";

export function getTraceIdFromRequest(req: Request): string {
  return req.headers.get(TRACE_HEADER) || randomUUID();
}

export function traceHeaders(traceId: string): Record<string, string> {
  return { [TRACE_HEADER]: traceId };
}

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  ctx?: { traceId?: string; route?: string; category?: string }
): Promise<T> {
  const traceId = ctx?.traceId || randomUUID();
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    if (ctx?.category) {
      prisma.performanceMetric
        .create({
          data: {
            category: ctx.category,
            route: ctx.route || name,
            durationMs,
            metadata: { traceId } as object,
          },
        })
        .catch(() => {});
    }
    logger.debug(`span.complete`, { traceId, span: name, durationMs, route: ctx?.route });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    logger.error(`span.error`, {
      traceId,
      span: name,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    });
    prisma.systemError
      .create({
        data: {
          source: name,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          metadata: { traceId, route: ctx?.route } as object,
        },
      })
      .catch(() => {});
    throw err;
  }
}
