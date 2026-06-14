import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db/prisma";
import { createToken, verifyPassword } from "@/server/lib/auth";
import { getDatabaseConfigError, isPrismaConnectionError } from "@/server/lib/db-config";
import "@/server/init";

export async function POST(req: Request) {
  const configError = getDatabaseConfigError();
  if (configError) {
    return NextResponse.json(
      {
        error: configError,
        configured: {
          databaseUrl: Boolean(process.env.DATABASE_URL),
          directUrl: Boolean(process.env.DIRECT_URL),
        },
      },
      { status: 503 }
    );
  }

  try {
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
      const msg = err instanceof Error ? err.message : "";
      const poolHint = msg.includes("connection pool")
        ? " Use Supabase Session pooler (port 5432) for DATABASE_URL on Vercel instead of Transaction pooler (6543)."
        : "";
      return NextResponse.json(
        {
          error: process.env.VERCEL
            ? `Database connection failed on Vercel.${poolHint} Verify pooler URL from Supabase → Connect.`
            : "Cannot connect to database. Check DATABASE_URL in .env, run npm run db:setup-supabase, then npm run db:seed",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Login failed" }, { status: 500 });
  }
}
