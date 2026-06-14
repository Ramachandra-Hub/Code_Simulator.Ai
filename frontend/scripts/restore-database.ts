/**
 * Database restore validation / restore
 * Run: npm run restore:db -- backups/file.sql [--dry-run]
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";

config({ path: resolve(__dirname, "../.env") });

const fileArg = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!fileArg) {
  console.error("Usage: npm run restore:db -- <backup.sql> [--dry-run]");
  process.exit(1);
}

const file = resolve(process.cwd(), fileArg);
if (!existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const tables = (sql.match(/CREATE TABLE/gi) || []).length;
const sizeKb = Math.round(sql.length / 1024);

console.log(`Backup file: ${file}`);
console.log(`Size: ${sizeKb} KB, ~${tables} CREATE TABLE statements`);

if (dryRun) {
  console.log("Dry-run OK — backup file is readable.");
  process.exit(0);
}

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error("DATABASE_URL or DIRECT_URL required for restore");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DB_RESTORE) {
  console.error("Set ALLOW_DB_RESTORE=true to restore in production");
  process.exit(1);
}

console.warn("Restoring database...");
execSync(`psql "${directUrl}" -f "${file}"`, { stdio: "inherit" });
console.log("Restore complete. Run npm run verify:deployment");
