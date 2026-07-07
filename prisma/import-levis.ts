/**
 * Importa as Calças Levis que não vieram na planilha original.
 * Agrupa feminina e masculina em 2 produtos, com variantes por tamanho.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

function parseCSV(filePath: string): Record<string, string>[] {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(l => l.trim());
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const vals = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] ?? "").trim(); });
    return row;
  });
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) throw new Error("Tenant não encontrado");

  // Busca ou cria categoria CALCA
  let categoria = await prisma.categoria.findFirst({
    where: { tenantId: tenant.id, nome: { contains: "CALCA", mode: "insensitive" } },
  });
  if (!categoria) {
    categoria = await prisma.categoria.create({
      data: { tenantId: tenant.id, nome: "CALCA", slug: "calca" },
    });
    console.log("✅ Categoria CALCA criada");
  } else {
    console.log(`📂 Usando categoria: ${categoria.nome}`);
  }

  const csvPath = path.resolve(__dirname, "../imports/calca-levis-entrada-original.csv");
  const rows = parseCSV(csvPath);
  console.log(`📄 ${rows.length} variantes no CSV\n`);

  // Agrupa por nome_produto (feminina vs masculino)
  const grupos = new Map<string, typeof rows>();
  for (const row of rows) {
    const nome = row["nome_produto"];
    if (!grupos.has(nome)) grupos.set(nome, []);
    grupos.get(nome)!.push(row);
  }

  let produtosCriados = 0;
  let variantesCriadas = 0;
  let variantesJaExistiam = 0;

  for (const [nomeProduto, variantes] of grupos.entries()) {
    // Determina gênero
    const genero = nomeProduto.includes("FEMININA") || nomeProduto.includes("FEMININO")
      ? "FEMININO" : "MASCULINO";

    // Preço de referência (maior preço de venda do grupo)
    const precoVenda = Math.max(...variantes.map(v => parseFloat(v["preco_venda"]) || 0));
    const precoCusto = Math.max(...variantes.map(v => parseFloat(v["preco_custo"]) || 0));

    // Verifica se produto já existe
    let produto = await prisma.produto.findFirst({
      where: {
        tenantId: tenant.id,
        nome: { contains: "LEVIS", mode: "insensitive" },
        genero: genero as any,
      },
    });

    if (!produto) {
      produto = await prisma.produto.create({
        data: {
          tenantId: tenant.id,
          nome: nomeProduto.trim(),
          marca: "LEVIS",
          genero: genero as any,
          precoVenda: new Prisma.Decimal(precoVenda),
          precoCusto: new Prisma.Decimal(precoCusto),
          categoriaId: categoria.id,
        },
      });
      produtosCriados++;
      console.log(`✅ Produto criado: ${nomeProduto} (${genero})`);
    } else {
      console.log(`📦 Produto já existe: ${produto.nome} — adicionando variantes`);
    }

    // Cria variantes
    for (const row of variantes) {
      const codigoBarras = row["codigo_barras"];
      const tamanho = row["tamanho"];
      const cor = row["cor"] || "JEANS";
      const qtd = parseInt(row["quantidade_original"]) || 0;
      const pv = parseFloat(row["preco_venda"]) || 0;

      // Verifica se variante já existe
      const existe = await prisma.produtoVariante.findFirst({
        where: { codigoBarras },
      });

      if (existe) {
        console.log(`  ⚠️  Variante já existe: ${codigoBarras} (tam ${tamanho})`);
        variantesJaExistiam++;
        continue;
      }

      await prisma.produtoVariante.create({
        data: {
          produtoId: produto.id,
          cor,
          tamanho,
          codigoBarras,
          codigoInterno: row["codigo_interno"],
          precoVenda: pv > 0 ? new Prisma.Decimal(pv) : null,
          qtdEstoque: qtd,
          qtdDisponivel: qtd,
        },
      });
      variantesCriadas++;
      console.log(`  ✅ Variante: tam ${tamanho} cor ${cor} qtd ${qtd} — R$ ${pv}`);
    }
    console.log();
  }

  // Resumo
  console.log("=".repeat(50));
  console.log(`📊 RESUMO:`);
  console.log(`  Produtos criados: ${produtosCriados}`);
  console.log(`  Variantes criadas: ${variantesCriadas}`);
  console.log(`  Variantes já existiam: ${variantesJaExistiam}`);

  // Verifica resultado
  const levisDB = await prisma.produto.findMany({
    where: { tenantId: tenant.id, nome: { contains: "levis", mode: "insensitive" } },
    include: { variantes: { select: { tamanho: true, qtdEstoque: true, precoVenda: true } } },
  });
  
  console.log(`\n✅ Produtos LEVIS no banco agora: ${levisDB.length}`);
  for (const p of levisDB) {
    const totalEst = p.variantes.reduce((s, v) => s + v.qtdEstoque, 0);
    const tamanhos = p.variantes.map(v => v.tamanho).join(", ");
    console.log(`  ${p.nome} — ${p.variantes.length} variantes (${tamanhos}) — ${totalEst} un`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
