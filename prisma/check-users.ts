import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) throw new Error("Tenant não encontrado");

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  console.log(`\n👥 Usuários da loja ${tenant.name}:\n`);
  for (const u of users) {
    console.log(`  Nome:  ${u.name}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Role:  ${u.role}`);
    console.log(`  Criado em: ${u.createdAt.toLocaleString("pt-BR")}`);
    console.log();
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
