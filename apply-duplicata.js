const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    // Execute a migration SQL to add DUPLICATA to enum
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "FormaPagamento" ADD VALUE IF NOT EXISTS 'DUPLICATA';
    `);
    console.log("✅ DUPLICATA added to FormaPagamento enum");

    // Add qtdParcelas column if not exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "qtdParcelas" INTEGER DEFAULT 1;
    `);
    console.log("✅ qtdParcelas column added to vendas table");

    // Verify
    const enumValues = await prisma.$queryRawUnsafe(`
      SELECT unnest(enum_range(NULL::"FormaPagamento")) as value
    `);
    console.log("📋 FormaPagamento values:", JSON.stringify(enumValues));

    const colExists = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='vendas' AND column_name='qtdParcelas'
    `);
    console.log("📋 qtdParcelas column:", JSON.stringify(colExists));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
