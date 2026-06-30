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
  console.log("🔧 Criando tabelas de orçamento...\n");

  // Enum
  await run("Enum StatusOrcamento", () => prisma.$executeRawUnsafe(
    `CREATE TYPE "StatusOrcamento" AS ENUM ('ABERTO', 'CONVERTIDO', 'CANCELADO', 'EXPIRADO')`
  ));

  // Tabela orcamentos
  await run("Tabela orcamentos", () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "orcamentos" (
      "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "numero"         INTEGER NOT NULL,
      "clienteId"      TEXT,
      "vendedorId"     TEXT NOT NULL,
      "status"         "StatusOrcamento" NOT NULL DEFAULT 'ABERTO',
      "validadeDias"   INTEGER NOT NULL DEFAULT 7,
      "dataValidade"   TIMESTAMP(3) NOT NULL,
      "subtotal"       DECIMAL(10,2) NOT NULL,
      "desconto"       DECIMAL(10,2) NOT NULL DEFAULT 0,
      "total"          DECIMAL(10,2) NOT NULL,
      "formaPagamento" "FormaPagamento",
      "observacoes"    TEXT,
      "vendaId"        TEXT,
      "tenantId"       TEXT NOT NULL,
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
    )
  `));

  // Tabela orcamento_itens
  await run("Tabela orcamento_itens", () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "orcamento_itens" (
      "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "orcamentoId" TEXT NOT NULL,
      "varianteId"  TEXT NOT NULL,
      "quantidade"  INTEGER NOT NULL,
      "precoUnit"   DECIMAL(10,2) NOT NULL,
      "desconto"    DECIMAL(10,2) NOT NULL DEFAULT 0,
      "subtotal"    DECIMAL(10,2) NOT NULL,
      CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY ("id")
    )
  `));

  // Unique vendaId
  await run("Unique orcamentos.vendaId", () => prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "orcamentos_vendaId_key" ON "orcamentos"("vendaId") WHERE "vendaId" IS NOT NULL`
  ));

  // Índices orcamentos
  await run("Index tenantId+numero", () => prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "orcamentos_tenantId_numero_key" ON "orcamentos"("tenantId", "numero")`
  ));
  await run("Index tenantId", () => prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "orcamentos_tenantId_idx" ON "orcamentos"("tenantId")`
  ));
  await run("Index clienteId", () => prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "orcamentos_clienteId_idx" ON "orcamentos"("clienteId")`
  ));
  await run("Index status", () => prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "orcamentos_status_idx" ON "orcamentos"("status")`
  ));
  await run("Index dataValidade", () => prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "orcamentos_dataValidade_idx" ON "orcamentos"("dataValidade")`
  ));

  // Índices orcamento_itens
  await run("Index orcamentoId", () => prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "orcamento_itens_orcamentoId_idx" ON "orcamento_itens"("orcamentoId")`
  ));
  await run("Index varianteId", () => prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "orcamento_itens_varianteId_idx" ON "orcamento_itens"("varianteId")`
  ));

  // FKs orcamentos
  await run("FK tenantId", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE`
  ));
  await run("FK clienteId", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL`
  ));
  await run("FK vendedorId", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "users"("id")`
  ));
  await run("FK vendaId", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id")`
  ));

  // FKs orcamento_itens
  await run("FK orcamentoId", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id") ON DELETE CASCADE`
  ));
  await run("FK varianteId", () => prisma.$executeRawUnsafe(
    `ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "produto_variantes"("id")`
  ));

  // Verifica
  const tables = await prisma.$queryRaw<{tablename: string}[]>`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND tablename IN ('orcamentos', 'orcamento_itens')
    ORDER BY tablename
  `;
  console.log(`\n📋 Tabelas criadas: ${tables.map((t) => t.tablename).join(", ")}`);

  // Regenera client Prisma
  console.log("\n✅ Tabelas prontas! Rode: npx prisma generate");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
