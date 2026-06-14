/**
 * Push Prisma schema to Supabase (or any configured DATABASE_URL / DIRECT_URL).
 * Run: npm run db:setup-supabase
 *
 * Requires DIRECT_URL for Supabase (port 5432). See prisma/supabase.env.example.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { execSync } from "child_process";

config({ path: resolve(__dirname, "../.env"), override: true });

const provider = process.env.DATABASE_PROVIDER || "unknown";
const direct = process.env.DIRECT_URL;
const pooled = process.env.DATABASE_URL;

if (!pooled || !direct) {
  console.error("\nMissing DATABASE_URL or DIRECT_URL in .env");
  console.error("Copy prisma/supabase.env.example → .env and fill Supabase credentials.\n");
  process.exit(1);
}

const placeholder = /postgres:(YOUR_DB_PASSWORD|\[YOUR_PASSWORD\])@/;
if (placeholder.test(pooled) || placeholder.test(direct)) {
  console.error("\n✗ Replace YOUR_DB_PASSWORD in .env with your Supabase database password.");
  console.error("  Supabase Dashboard → Project Settings → Database → Database password\n");
  process.exit(1);
}

console.log(`\nDatabase provider: ${provider}`);
console.log(`Pooled URL: ${maskUrl(pooled)}`);
console.log(`Direct URL: ${maskUrl(direct)}\n`);

try {
  execSync("npx prisma db push", {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });
  console.log("\n✓ Schema pushed successfully.\n");
  console.log("Seeding demo users (arjun@nexusedge.edu / demo1234)...\n");
  execSync("npx tsx prisma/seed.ts", {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });
  console.log("\n✓ Supabase ready. Login with arjun@nexusedge.edu / demo1234\n");
} catch {
  console.error("\n✗ db push failed. Check DIRECT_URL and database password in .env\n");
  process.exit(1);
}

function maskUrl(url: string): string {
  return url.replace(/:([^:@/]+)@/, ":****@");
}
