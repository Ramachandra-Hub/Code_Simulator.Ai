import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "User login" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("register")
  @ApiOperation({ summary: "User registration" })
  register(@Body() dto: LoginDto) {
    return this.authService.register(dto);
  }
}
