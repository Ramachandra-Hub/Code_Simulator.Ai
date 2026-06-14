import { registerAllAgents } from "./career-intelligence/agents/register-all";
import { registerTalentAgents } from "./talent/agents/talent-agents";
import { registerCareerOSAgents } from "./career-os/agents/career-os-agents";
import { registerOfficeAgents } from "./virtual-office/agents/office-agents";
import { initOpenTelemetry } from "./core/observability/otel";
import { redisHealthCheck } from "./core/redis/redis-client";
import { logger } from "./core/observability/logger";
import "./career-intelligence/memory/digital-twin";

let initialized = false;

export function initializeServer(): void {
  if (initialized) return;
  registerAllAgents();
  registerTalentAgents();
  registerCareerOSAgents();
  registerOfficeAgents();
  void initOpenTelemetry();
  void redisHealthCheck().then((h) => {
    if (h.configured) logger.info("redis.health", { available: h.available, persistence: h.persistence });
  });
  initialized = true;
}

initializeServer();
