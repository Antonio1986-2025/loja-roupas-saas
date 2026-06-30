import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function main() {
  // Lista todos os índices das tabelas de orçamento
  const indexes = await prisma.$queryRaw<{indexname: string, tablename: string}[]>`
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE tablename IN ('orcamentos', 'orcamento_itens')
    ORDER BY tablename, indexname
  `;
  console.log("Índices existentes:");
  indexes.forEach(i => console.log(`  ${i.tablename}.${i.indexname}`));

  // O problema: prisma db push tenta criar "orcamentos_vendaId_key"
  // mas esse índice já existe com nome diferente ou com conflito
  // Vamos dropar todos os índices não-PK das tabelas e deixar o prisma recriar
  
  const toDrop = indexes
    .filter(i => !i.indexname.endsWith("_pkey"))
    .map(i => i.indexname);

  console.log("\nDropando índices (prisma vai recriar):");
  for (const idx of toDrop) {
    try {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx}"`);
      console.log(`  ✅ Dropado: ${idx}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ⚠️  ${idx}: ${msg.slice(0, 80)}`);
    }
  }

  // Também dropa as FK constraints para o prisma recriar
  console.log("\nDropando FK constraints:");
  const constraints = await prisma.$queryRaw<{conname: string}[]>`
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid IN ('orcamentos'::regclass, 'orcamento_itens'::regclass)
    AND contype = 'f'
  `;
  
  for (const c of constraints) {
    const tbl = c.conname.startsWith("orcamento_itens") ? "orcamento_itens" : "orcamentos";
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${tbl}" DROP CONSTRAINT IF EXISTS "${c.conname}"`);
      console.log(`  ✅ Dropada FK: ${c.conname}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ⚠️  ${c.conname}: ${msg.slice(0, 80)}`);
    }
  }

  console.log("\n✅ Pronto. O prisma db push pode agora recriar tudo sem conflito.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
