/** Returns a user-facing message when database env is misconfigured. */
export function getDatabaseConfigError(): string | null {
  const url = process.env.DATABASE_URL || "";
  const direct = process.env.DIRECT_URL || "";

  if (!url || !direct) {
    if (process.env.VERCEL) {
      return "Database not configured on Vercel. Add DATABASE_URL and DIRECT_URL under Project Settings → Environment Variables, then redeploy.";
    }
    return "Database not configured. Set DATABASE_URL and DIRECT_URL in .env";
  }

  if (process.env.VERCEL && url.includes("db.") && url.includes(".supabase.co") && !url.includes("pooler.supabase.com")) {
    return "DATABASE_URL uses db.*.supabase.co which is IPv6-only. Vercel needs the Supabase pooler URL (pooler.supabase.com) from Dashboard → Connect → Transaction pooler.";
  }

  const placeholder = /postgres:(YOUR_DB_PASSWORD|\[YOUR_PASSWORD\])@/;
  if (placeholder.test(url) || placeholder.test(direct)) {
    return "Supabase database password not set. Replace [YOUR_PASSWORD] with your password from Supabase → Settings → Database";
  }

  return null;
}

export function isPrismaConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database") ||
    msg.includes("Authentication failed") ||
    msg.includes("Database not configured") ||
    msg.includes("PrismaClientConstructorValidationError") ||
    msg.includes("P1001") ||
    msg.includes("P1000") ||
    msg.includes("P1017") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT")
  );
}
