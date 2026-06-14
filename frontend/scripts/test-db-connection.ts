import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

async function main() {
  const url = process.env.DATABASE_URL || "";
  if (/postgres:(YOUR_DB_PASSWORD|\[YOUR_PASSWORD\])@/.test(url)) {
    console.error("FAIL: DATABASE_URL still has placeholder password");
    process.exit(1);
  }
  const { prisma } = await import("../src/server/core/db/prisma");
  await prisma.$queryRaw`SELECT 1`;
  const count = await prisma.user.count();
  console.log(`OK: connected (${process.env.DATABASE_PROVIDER}), users=${count}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
