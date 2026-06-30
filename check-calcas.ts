import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway",
    },
  },
});

async function main() {
  // Busca tenant
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) { console.log("Tenant não encontrado!"); return; }

  // Total de produtos
  const totalProdutos = await prisma.produto.count({ where: { tenantId: tenant.id } });
  const totalVariantes = await prisma.produtoVariante.count({
    where: { produto: { tenantId: tenant.id } },
  });

  // Busca calças
  const calcas = await prisma.produto.findMany({
    where: {
      tenantId: tenant.id,
      OR: [
        { nome: { contains: "calca", mode: "insensitive" } },
        { nome: { contains: "calça", mode: "insensitive" } },
        { nome: { contains: "jeans", mode: "insensitive" } },
        { nome: { contains: "pant", mode: "insensitive" } },
        { nome: { contains: "bermuda", mode: "insensitive" } },
      ],
    },
    include: {
      variantes: {
        select: {
          id: true,
          cor: true,
          tamanho: true,
          qtdEstoque: true,
          qtdDisponivel: true,
        },
      },
      categoria: { select: { nome: true } },
    },
    orderBy: { nome: "asc" },
  });

  console.log(`\n=== BANCO: california-store ===`);
  console.log(`Total de produtos: ${totalProdutos}`);
  console.log(`Total de variantes: ${totalVariantes}`);
  console.log(`\n=== CALÇAS / JEANS / BERMUDAS encontradas: ${calcas.length} produtos ===\n`);

  let totalUnidades = 0;
  let totalDisponivel = 0;
  let semEstoque = 0;

  for (const p of calcas) {
    const estoque = p.variantes.reduce((s, v) => s + v.qtdEstoque, 0);
    const disponivel = p.variantes.reduce((s, v) => s + v.qtdDisponivel, 0);
    const tamanhos = [...new Set(p.variantes.map((v) => v.tamanho).filter(Boolean))].sort().join(", ");
    const cores = [...new Set(p.variantes.map((v) => v.cor).filter(Boolean))].join(", ");

    totalUnidades += estoque;
    totalDisponivel += disponivel;
    if (estoque === 0) semEstoque++;

    console.log(`📦 ${p.nome}`);
    console.log(`   Categoria: ${p.categoria?.nome ?? "—"}`);
    console.log(`   Variantes: ${p.variantes.length} | Estoque: ${estoque} un | Disponível: ${disponivel} un`);
    if (tamanhos) console.log(`   Tamanhos: ${tamanhos}`);
    if (cores)    console.log(`   Cores: ${cores}`);
    if (estoque === 0) console.log(`   ⚠️  SEM ESTOQUE`);
    console.log();
  }

  console.log(`=== RESUMO ===`);
  console.log(`Produtos encontrados: ${calcas.length}`);
  console.log(`Total unidades em estoque: ${totalUnidades}`);
  console.log(`Total disponível: ${totalDisponivel}`);
  console.log(`Sem estoque: ${semEstoque}`);

  // Categorias existentes
  const categorias = await prisma.categoria.findMany({
    where: { tenantId: tenant.id },
    select: { nome: true, _count: { select: { produtos: true } } },
    orderBy: { nome: "asc" },
  });

  console.log(`\n=== CATEGORIAS ===`);
  for (const cat of categorias) {
    console.log(`  ${cat.nome}: ${cat._count.produtos} produtos`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
