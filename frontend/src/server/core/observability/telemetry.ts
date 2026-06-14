interface TelemetryEvent {
  name: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

class Telemetry {
  private events: TelemetryEvent[] = [];

  record(name: string, metadata?: Record<string, unknown>, durationMs?: number): void {
    const event: TelemetryEvent = {
      name,
      durationMs,
      metadata,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    if (this.events.length > 1000) this.events.shift();

    if (process.env.NODE_ENV === "development") {
      console.log(`[telemetry] ${name}`, durationMs ? `${durationMs}ms` : "", metadata || "");
    }
  }

  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.record(name, { ...metadata, status: "success" }, Date.now() - start);
      return result;
    } catch (err) {
      this.record(name, { ...metadata, status: "error", error: err instanceof Error ? err.message : "unknown" }, Date.now() - start);
      throw err;
    }
  }

  getEvents(limit = 100): TelemetryEvent[] {
    return this.events.slice(-limit);
  }

  getStats(): Record<string, { count: number; avgDurationMs: number }> {
    const stats: Record<string, { count: number; totalMs: number }> = {};
    for (const e of this.events) {
      if (!stats[e.name]) stats[e.name] = { count: 0, totalMs: 0 };
      stats[e.name].count++;
      stats[e.name].totalMs += e.durationMs || 0;
    }
    return Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [k, { count: v.count, avgDurationMs: Math.round(v.totalMs / v.count) }])
    );
  }
}

export const telemetry = new Telemetry();
