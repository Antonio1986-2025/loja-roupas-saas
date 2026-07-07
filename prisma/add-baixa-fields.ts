import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function run(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`✅ ${label}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.log(`⚠️  Já existe: ${label}`);
    } else {
      console.error(`❌ ${label}: ${msg.slice(0, 120)}`);
    }
  }
}

async function main() {
  console.log("🔧 Adicionando campos de baixa profissional...\n");

  // ContaPagar — novos campos
  await run("contas_pagar.valorPago", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "valorPago" DECIMAL(10,2)`
  ));
  await run("contas_pagar.juros", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "juros" DECIMAL(10,2)`
  ));
  await run("contas_pagar.multa", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "multa" DECIMAL(10,2)`
  ));
  await run("contas_pagar.desconto", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "desconto" DECIMAL(10,2)`
  ));
  await run("contas_pagar.formaPagamento", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "formaPagamento" "FormaPagamento"`
  ));
  await run("contas_pagar.numeroDocumento", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "numeroDocumento" VARCHAR(100)`
  ));

  // ContaReceber — novos campos
  await run("contas_receber.valorRecebido", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "valorRecebido" DECIMAL(10,2)`
  ));
  await run("contas_receber.juros", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "juros" DECIMAL(10,2)`
  ));
  await run("contas_receber.multa", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "multa" DECIMAL(10,2)`
  ));
  await run("contas_receber.desconto", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "desconto" DECIMAL(10,2)`
  ));
  await run("contas_receber.numeroDocumento", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "numeroDocumento" VARCHAR(100)`
  ));

  console.log("\n✅ Campos adicionados com sucesso!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
