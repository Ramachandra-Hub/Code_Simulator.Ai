/** Returns a user-facing message when database env is misconfigured. */
export function getDatabaseConfigError(): string | null {
  const url = process.env.DATABASE_URL || "";
  const direct = process.env.DIRECT_URL || "";

  if (!url || !direct) {
    return "Database not configured. Set DATABASE_URL and DIRECT_URL in .env";
  }

  const placeholder = /postgres:(YOUR_DB_PASSWORD|\[YOUR_PASSWORD\])@/;
  if (placeholder.test(url) || placeholder.test(direct)) {
    return "Supabase database password not set. In .env replace YOUR_DB_PASSWORD with your password from Supabase → Settings → Database";
  }

  return null;
}

export function isPrismaConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database") ||
    msg.includes("Authentication failed") ||
    msg.includes("P1001") ||
    msg.includes("P1000") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND")
  );
}
