import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      service: "nexusedge-api",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };
  }
}
