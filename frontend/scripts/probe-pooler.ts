import { PrismaClient } from "@prisma/client";

const ref = process.env.SUPABASE_PROJECT_REF || "glwqznaubolhqvakrknz";
const pass = process.env.SUPABASE_DB_PASSWORD || "RAMACHANDRACOLLEGEOFENGINEERING";
const url = process.env.DATABASE_URL;
const hosts = process.argv.slice(2);

if (!url && hosts.length === 0) {
  console.error("Pass pooler hostnames as args or set DATABASE_URL");
  process.exit(1);
}

const toTest =
  hosts.length > 0
    ? hosts.map((host) => ({
        host,
        url: `postgresql://postgres.${ref}:${pass}@${host}:5432/postgres?sslmode=require`,
      }))
    : [{ host: "from-env", url: url! }];

async function probe(entry: { host: string; url: string }) {
  const client = new PrismaClient({ datasources: { db: { url: entry.url } } });
  try {
    await client.$queryRaw`SELECT 1`;
    const count = await client.user.count();
    console.log(`OK ${entry.host} users=${count}`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`FAIL ${entry.host} ${msg.replace(/\s+/g, " ").slice(0, 200)}`);
    return false;
  } finally {
    await client.$disconnect().catch(() => undefined);
  }
}

async function main() {
  for (const entry of toTest) {
    if (await probe(entry)) process.exit(0);
  }
  process.exit(1);
}

main();
