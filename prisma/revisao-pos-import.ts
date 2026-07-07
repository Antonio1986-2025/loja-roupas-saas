import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) throw new Error("Tenant não encontrado");
  const tenantId = tenant.id;

  console.log("🔍 REVISÃO COMPLETA — California Store\n");

  // 1. Comparação com planilha
  console.log("=".repeat(50));
  console.log("1. COMPARAÇÃO COM A PLANILHA (640 linhas)");
  console.log("=".repeat(50));

  const totalVar = await prisma.produtoVariante.count({ where: { produto: { tenantId } } });
  console.log(`Variantes na planilha: 640`);
  console.log(`Variantes no banco:    ${totalVar}`);
  console.log(`Diferença: ${totalVar - 640}`);

  // 2. Produtos com problemas
  console.log("\n" + "=".repeat(50));
  console.log("2. PRODUTOS COM PROBLEMAS POTENCIAIS");
  console.log("=".repeat(50));

  // Produtos sem preço de venda (apenas 0)
  const semPreco = await prisma.produto.count({
    where: { tenantId, precoVenda: 0 },
  });
  console.log(`Sem preço de venda (= 0): ${semPreco}`);

  // Produtos sem custo
  const semCusto = await prisma.produto.count({
    where: { tenantId, precoCusto: null },
  });
  console.log(`Sem preço de custo: ${semCusto}`);

  // Produtos sem foto
  const semFoto = await prisma.produto.count({
    where: { tenantId, fotoUrl: null },
  });
  console.log(`Sem foto: ${semFoto}`);

  if (semFoto > 0) {
    const produtosSemFoto = await prisma.produto.findMany({
      where: { tenantId, fotoUrl: null },
      select: { nome: true },
      take: 15,
    });
    console.log("  Produtos sem foto:");
    produtosSemFoto.forEach(p => console.log(`    - ${p.nome}`));
  }

  // Variantes sem estoque
  const semEstoque = await prisma.produtoVariante.count({
    where: { produto: { tenantId }, qtdEstoque: 0 },
  });
  const comEstoque = await prisma.produtoVariante.count({
    where: { produto: { tenantId }, qtdEstoque: { gt: 0 } },
  });
  console.log(`\nVariantes com estoque: ${comEstoque}`);
  console.log(`Variantes sem estoque (qtd=0): ${semEstoque}`);

  // 3. Códigos de barras
  console.log("\n" + "=".repeat(50));
  console.log("3. INTEGRIDADE DE CÓDIGOS");
  console.log("=".repeat(50));

  const variantes = await prisma.produtoVariante.findMany({
    where: { produto: { tenantId } },
    select: { codigoBarras: true, codigoInterno: true },
  });
  const codigosBarras = new Set(variantes.map(v => v.codigoBarras));
  console.log(`Códigos de barras únicos: ${codigosBarras.size} / ${variantes.length}`);
  
  // Quantos códigos internos duplicados (esperado pois é o original)
  const internosCount = new Map<string, number>();
  for (const v of variantes) {
    if (v.codigoInterno) internosCount.set(v.codigoInterno, (internosCount.get(v.codigoInterno) ?? 0) + 1);
  }
  const duplicados = [...internosCount.entries()].filter(([, n]) => n > 1);
  console.log(`Códigos internos duplicados (esperado): ${duplicados.length}`);

  // 4. Valor de estoque
  console.log("\n" + "=".repeat(50));
  console.log("4. VALOR FINANCEIRO DO ESTOQUE");
  console.log("=".repeat(50));

  const valorEstoque = await prisma.$queryRaw<{ valor_custo: number; valor_venda: number }[]>`
    SELECT 
      COALESCE(SUM(p."precoCusto" * pv."qtdEstoque"), 0)::float as valor_custo,
      COALESCE(SUM(COALESCE(pv."precoVenda", p."precoVenda") * pv."qtdEstoque"), 0)::float as valor_venda
    FROM "produto_variantes" pv
    JOIN "produtos" p ON p.id = pv."produtoId"
    WHERE p."tenantId" = ${tenantId}
  `;
  console.log(`Valor total a CUSTO: R$ ${(valorEstoque[0]?.valor_custo ?? 0).toFixed(2)}`);
  console.log(`Valor total a VENDA: R$ ${(valorEstoque[0]?.valor_venda ?? 0).toFixed(2)}`);

  // 5. Amostra de produtos com foto
  console.log("\n" + "=".repeat(50));
  console.log("5. AMOSTRA DE PRODUTOS (verifique se foto carrega)");
  console.log("=".repeat(50));

  const amostra = await prisma.produto.findMany({
    where: { tenantId, fotoUrl: { not: null } },
    take: 5,
    select: { nome: true, fotoUrl: true, precoVenda: true, variantes: { select: { qtdEstoque: true } } },
  });
  for (const p of amostra) {
    const totalEst = p.variantes.reduce((s, v) => s + v.qtdEstoque, 0);
    console.log(`\n📦 ${p.nome}`);
    console.log(`   Preço: R$ ${Number(p.precoVenda).toFixed(2)} · Estoque: ${totalEst} un`);
    console.log(`   Foto: ${p.fotoUrl?.slice(0, 90)}...`);
  }

  // 6. Verificações finais
  console.log("\n" + "=".repeat(50));
  console.log("6. PRESERVAÇÃO DE DADOS");
  console.log("=".repeat(50));

  const clientes = await prisma.cliente.count({ where: { tenantId } });
  const users = await prisma.user.count({ where: { tenantId } });
  const vendas = await prisma.venda.count({ where: { tenantId } });
  const entradas = await prisma.entradaMercadoria.count({ where: { tenantId } });
  console.log(`Clientes preservados: ${clientes}`);
  console.log(`Usuários preservados: ${users}`);
  console.log(`Vendas restantes: ${vendas} (deveria ser 0)`);
  console.log(`Entradas restantes: ${entradas} (deveria ser 0)`);

  const config = await prisma.configuracao.findFirst({ where: { tenantId } });
  console.log(`Configuração: ${config ? "✅ preservada" : "❌ ausente"}`);

  // ===== DIAGNÓSTICO =====
  console.log("\n" + "=".repeat(50));
  console.log("📋 DIAGNÓSTICO FINAL");
  console.log("=".repeat(50));

  const problemas: string[] = [];
  if (totalVar !== 640) problemas.push(`⚠️  Variantes (${totalVar}) ≠ planilha (640)`);
  if (vendas > 0) problemas.push(`⚠️  ${vendas} vendas não foram apagadas`);
  if (entradas > 0) problemas.push(`⚠️  ${entradas} entradas não foram apagadas`);
  if (semFoto > 30) problemas.push(`⚠️  Muitos produtos sem foto (${semFoto})`);

  if (problemas.length === 0) {
    console.log("✅ TUDO CERTO! Loja pronta para uso.");
  } else {
    console.log("Problemas encontrados:");
    problemas.forEach(p => console.log(`  ${p}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
