import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db/prisma";
import { createToken, verifyPassword, ensureDemoUsers } from "@/server/lib/auth";
import { getDatabaseConfigError, isPrismaConnectionError } from "@/server/lib/db-config";
import "@/server/init";

export async function POST(req: Request) {
  const configError = getDatabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    await ensureDemoUsers();
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
    response.cookies.set("nexusedge_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 604800,
      sameSite: "lax",
    });
    return response;
  } catch (err) {
    if (isPrismaConnectionError(err)) {
      return NextResponse.json(
        {
          error: process.env.VERCEL
            ? "Cannot connect to database on Vercel. Verify DATABASE_URL uses the Supabase pooler (port 6543) and DIRECT_URL uses port 5432, then redeploy."
            : "Cannot connect to database. Check DATABASE_URL in .env, run npm run db:setup-supabase, then npm run db:seed",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Login failed" }, { status: 500 });
  }
}
