/**
 * Database backup — pg_dump to backups/
 * Run: npm run backup:db
 */
import { config } from "dotenv";
import { resolve } from "path";
import { mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";

config({ path: resolve(__dirname, "../.env") });

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error("DATABASE_URL or DIRECT_URL required");
  process.exit(1);
}

const outDir = resolve(__dirname, "../backups");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outFile = resolve(outDir, `nexusedge-${stamp}.sql`);

console.log(`Backing up to ${outFile}...`);
try {
  execSync(`pg_dump "${directUrl}" -F p -f "${outFile}"`, { stdio: "inherit" });
  console.log("Backup complete.");
} catch (err) {
  console.error("pg_dump failed. Ensure PostgreSQL client tools are installed.");
  console.error(err);
  process.exit(1);
}
