import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) return;

  const forns = await prisma.fornecedor.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  console.log(`📋 Fornecedores da California Store (${forns.length}):\n`);
  for (const f of forns) {
    console.log(`ID: ${f.id}`);
    console.log(`  Nome: "${f.nome}"`);
    console.log(`  CNPJ: "${f.cnpj ?? ""}"`);
    console.log(`  Telefone: "${f.telefone ?? ""}"`);
    console.log(`  Email: "${f.email ?? ""}"`);
    console.log(`  Endereço: "${f.endereco ?? ""}"`);
    console.log(`  Cidade: "${f.cidade ?? ""}" | Estado: "${f.estado ?? ""}" | CEP: "${f.cep ?? ""}"`);
    console.log(`  Criado em: ${f.createdAt.toLocaleString("pt-BR")}`);
    console.log();
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
