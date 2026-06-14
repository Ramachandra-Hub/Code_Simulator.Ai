import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db/prisma";
import { createToken, ensureDemoUsers, DEMO_CREDENTIALS } from "@/server/lib/auth";
import { getDatabaseConfigError, isPrismaConnectionError } from "@/server/lib/db-config";
import type { UserRole } from "@prisma/client";
import "@/server/init";

export async function POST(req: Request) {
  const configError = getDatabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    await ensureDemoUsers();
    const { role } = await req.json();
    const credentials = DEMO_CREDENTIALS[role as UserRole];
    if (!credentials) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: credentials.email } });
    if (!user) return NextResponse.json({ error: "Demo user missing" }, { status: 500 });

    const token = await createToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
    response.cookies.set("nexusedge_token", token, { httpOnly: true, path: "/", maxAge: 604800, sameSite: "lax" });
    return response;
  } catch (err) {
    if (isPrismaConnectionError(err)) {
      return NextResponse.json(
        {
          error:
            "Cannot connect to database. Check DATABASE_URL in .env, run npm run db:setup-supabase, then npm run db:seed",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Demo login failed" }, { status: 500 });
  }
}
