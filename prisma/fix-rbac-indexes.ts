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
    if (msg.includes("does not exist") || msg.includes("não existe")) {
      console.log(`⚠️  Não existe (ok): ${label}`);
    } else {
      console.error(`❌ ${label}: ${msg.slice(0, 120)}`);
    }
  }
}

async function main() {
  console.log("🔧 Dropando índices e constraints conflitantes...\n");

  // Lista todos os índices da tabela funcionarios
  const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'funcionarios' AND indexname != 'funcionarios_pkey'
  `;
  console.log("Índices atuais:", indexes.map(i => i.indexname).join(", "));

  // Lista constraints da tabela funcionarios
  const constraints = await prisma.$queryRaw<{ conname: string; contype: string }[]>`
    SELECT conname, contype FROM pg_constraint
    WHERE conrelid = 'funcionarios'::regclass
    AND contype IN ('u', 'f')
  `;
  console.log("Constraints atuais:", constraints.map(c => `${c.conname}(${c.contype})`).join(", "));

  // Dropa TODOS os índices não-PK (prisma vai recriar)
  for (const idx of indexes) {
    if (idx.indexname !== "funcionarios_pkey") {
      await run(`DROP INDEX ${idx.indexname}`, () =>
        prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx.indexname}"`)
      );
    }
  }

  // Dropa constraints FK e UNIQUE
  for (const c of constraints) {
    await run(`DROP CONSTRAINT ${c.conname}`, () =>
      prisma.$executeRawUnsafe(`ALTER TABLE "funcionarios" DROP CONSTRAINT IF EXISTS "${c.conname}"`)
    );
  }

  // Verifica resultado
  const remaining = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes WHERE tablename = 'funcionarios'
  `;
  console.log("\nÍndices restantes:", remaining.map(i => i.indexname).join(", "));
  console.log("\n✅ Pronto! O prisma db push pode recriar tudo sem conflito.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
