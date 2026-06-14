import { getUserFromRequest, type AuthUser } from "../lib/auth";

const RECRUITER_ROLES = new Set(["recruiter", "super_admin", "placement_officer"]);

export async function requireRecruiterAccess(req: Request): Promise<AuthUser | null> {
  const user = await getUserFromRequest(req);
  if (!user || !RECRUITER_ROLES.has(user.role)) return null;
  return user;
}
