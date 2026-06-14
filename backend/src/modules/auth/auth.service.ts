import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./dto/login.dto";

const DEMO_USERS = [
  { id: "1", email: "arjun@nexusedge.edu", password: "demo1234", role: "student", name: "Arjun Mehta" },
  { id: "2", email: "alex@nexusedge.ai", password: "demo1234", role: "super_admin", name: "Alex Chen" },
];

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto) {
    const user = DEMO_USERS.find(
      (u) => u.email === dto.email && u.password === dto.password
    );

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    };
  }

  async register(dto: LoginDto) {
    const payload = { sub: "new", email: dto.email, role: "student" };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: "new", email: dto.email, role: "student", name: dto.email.split("@")[0] },
    };
  }
}
