import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});
async function run(label: string, fn: () => Promise<unknown>) {
  try { await fn(); console.log(`✅ ${label}`); }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already exists") || msg.includes("duplicate")) console.log(`⚠️  Já existe: ${label}`);
    else console.error(`❌ ${label}: ${msg.slice(0,120)}`);
  }
}
async function main() {
  // Add userId to funcionarios table
  await run("funcionarios.userId", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "userId" TEXT`
  ));
  await run("funcionarios.userId_fk", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL`
  ));
  await run("funcionarios.userId_unique", () => prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "funcionarios_userId_key" ON "funcionarios"("userId") WHERE "userId" IS NOT NULL`
  ));
  
  // Add new role values to the enum
  await run("UserRole VENDEDOR", () => prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VENDEDOR'`));
  await run("UserRole CAIXA", () => prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CAIXA'`));
  await run("UserRole ESTOQUISTA", () => prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ESTOQUISTA'`));
  await run("UserRole FINANCEIRO", () => prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCEIRO'`));
  
  // Verify
  const result = await prisma.$queryRaw<{column_name: string}[]>`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'funcionarios' AND column_name = 'userId'
  `;
  console.log("userId column exists:", result.length > 0);
}
main().catch(console.error).finally(() => prisma.$disconnect());
