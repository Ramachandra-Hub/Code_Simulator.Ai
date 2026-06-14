export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  traceId?: string;
  spanId?: string;
  service?: string;
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, ctx?: LogContext): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    env: process.env.NODE_ENV || "development",
    ...ctx,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, ctx?: LogContext) => emit("debug", message, ctx),
  info: (message: string, ctx?: LogContext) => emit("info", message, ctx),
  warn: (message: string, ctx?: LogContext) => emit("warn", message, ctx),
  error: (message: string, ctx?: LogContext) => emit("error", message, ctx),
};
