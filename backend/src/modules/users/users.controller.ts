import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  @Get("roles")
  @ApiOperation({ summary: "List available user roles" })
  getRoles() {
    return [
      "super_admin",
      "college_admin",
      "placement_officer",
      "training_coordinator",
      "faculty",
      "recruiter",
      "student",
    ];
  }
}
