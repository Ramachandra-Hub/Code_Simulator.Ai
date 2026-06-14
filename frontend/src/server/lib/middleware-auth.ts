import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-me"
);

export interface MiddlewareAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function verifyTokenEdge(token: string): Promise<MiddlewareAuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: { cookies: { get: (n: string) => { value: string } | undefined }; headers: { get: (n: string) => string | null } }): string | null {
  const cookie = request.cookies.get("nexusedge_token");
  if (cookie?.value) return cookie.value;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/** Dashboard and app routes requiring authentication */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/learn",
  "/coding",
  "/dsa",
  "/assessments",
  "/resume",
  "/resume-analysis",
  "/ats",
  "/interview",
  "/twin",
  "/portfolio",
  "/projects",
  "/placements",
  "/ai-coach",
  "/analytics",
  "/leaderboard",
  "/profile",
];

export const PUBLIC_PATHS = ["/", "/login"];

export function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return false;
  if (pathname.startsWith("/api/auth")) return false;
  if (pathname.startsWith("/_next")) return false;
  if (pathname.startsWith("/favicon")) return false;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
