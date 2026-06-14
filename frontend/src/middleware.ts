import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTokenFromRequest, isProtectedPath, verifyTokenEdge } from "@/server/lib/middleware-auth";
import { checkRateLimit } from "@/server/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, rule } = checkRateLimit(ip, path);
    if (!allowed && rule) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec: 60 },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  if (isProtectedPath(path)) {
    const token = getTokenFromRequest(request);
    if (!token) {
      const login = new URL("/login", request.url);
      login.searchParams.set("redirect", path);
      return NextResponse.redirect(login);
    }
    const user = await verifyTokenEdge(token);
    if (!user) {
      const login = new URL("/login", request.url);
      login.searchParams.set("redirect", path);
      const res = NextResponse.redirect(login);
      res.cookies.delete("nexusedge_token");
      return res;
    }
  }

  if (path === "/login") {
    const token = getTokenFromRequest(request);
    if (token) {
      const user = await verifyTokenEdge(token);
      if (user) {
        const redirect = request.nextUrl.searchParams.get("redirect");
        const rolePaths: Record<string, string> = {
          student: "/dashboard/student",
          faculty: "/dashboard/faculty",
          college_admin: "/dashboard/college-admin",
          super_admin: "/dashboard/super-admin",
          placement_officer: "/dashboard/placement-officer",
          training_coordinator: "/dashboard/training-coordinator",
          recruiter: "/dashboard/recruiter",
        };
        const home = redirect && isProtectedPath(redirect) ? redirect : (rolePaths[user.role] || "/dashboard/student");
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
