import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) { console.log("Tenant não encontrado!"); return; }

  const variantes = await prisma.produtoVariante.findMany({
    where: { produto: { tenantId: tenant.id } },
    select: {
      codigoBarras: true,
      cor: true,
      tamanho: true,
      qtdEstoque: true,
      qtdDisponivel: true,
      produto: { select: { nome: true, categoria: { select: { nome: true } } } },
    },
    orderBy: [{ produto: { nome: "asc" } }, { tamanho: "asc" }],
  });

  console.log("produto,categoria,cor,tamanho,codigoBarras,qtdEstoque,qtdDisponivel");
  for (const v of variantes) {
    const nome = v.produto.nome.replace(/,/g, " ");
    const cat = (v.produto.categoria?.nome ?? "").replace(/,/g, " ");
    const cor = (v.cor ?? "").replace(/,/g, " ");
    const tam = (v.tamanho ?? "").replace(/,/g, " ");
    const cod = (v.codigoBarras ?? "").replace(/,/g, " ");
    console.log(`${nome},${cat},${cor},${tam},${cod},${v.qtdEstoque},${v.qtdDisponivel}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
