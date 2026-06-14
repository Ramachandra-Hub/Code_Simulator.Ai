import { createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "../core/db/prisma";
import { cacheSession, getCachedSession } from "../core/redis/session-cache";
import { demoUsersAllowed } from "../core/security/production-guards";
import type { UserRole } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-me"
);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  const cached = await getCachedSession(tokenHash(token));
  if (cached) return cached;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user: AuthUser = {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
    };
    await cacheSession(tokenHash(token), user);
    return user;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return verifyToken(auth.slice(7));
  }
  const cookie = req.headers.get("cookie");
  const match = cookie?.match(/nexusedge_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string; name: string }> = {
  student: { email: "arjun@nexusedge.edu", password: "demo1234", name: "Arjun Mehta" },
  faculty: { email: "priya@nexusedge.edu", password: "demo1234", name: "Priya Sharma" },
  college_admin: { email: "admin@nexusedge.edu", password: "demo1234", name: "College Admin" },
  super_admin: { email: "alex@nexusedge.ai", password: "demo1234", name: "Alex Chen" },
  placement_officer: { email: "raj@nexusedge.edu", password: "demo1234", name: "Raj Kumar" },
  training_coordinator: { email: "sneha@nexusedge.edu", password: "demo1234", name: "Sneha Patel" },
  recruiter: { email: "mike@techcorp.com", password: "demo1234", name: "Mike Johnson" },
};

export async function ensureDemoUsers(): Promise<void> {
  if (!demoUsersAllowed()) return;
  for (const [role, demo] of Object.entries(DEMO_CREDENTIALS) as Array<[UserRole, typeof DEMO_CREDENTIALS[UserRole]]>) {
    const existing = await prisma.user.findUnique({ where: { email: demo.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: demo.email,
          name: demo.name,
          role,
          passwordHash: await hashPassword(demo.password),
          profile: role === "student" ? {
            create: {
              institution: "IIT Delhi",
              department: "Computer Science",
              careerGoal: "Software Engineer",
              skills: ["JavaScript", "Python", "React", "DSA"],
            },
          } : undefined,
        },
      });
    }
  }
}
