/**
 * sync-estoque-california.ts
 * Sincroniza estoque do CSV do Lovable (estoque-california-2026-06-27.csv)
 * com o banco do Stori SaaS usando codigo_barras como chave primária.
 * Também atualiza preco_custo e preco_venda quando disponíveis.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    // parse respeitando campos com vírgula entre aspas
    const fields: string[] = [];
    let inQuotes = false;
    let current = "";
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    fields.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (fields[i] ?? "").trim(); });
    return row;
  });
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) throw new Error("Tenant california-store não encontrado");

  const csvPath = path.resolve(__dirname, "../imports/estoque-california-2026-06-27.csv");
  const rows = parseCSV(csvPath);
  console.log(`📄 CSV carregado: ${rows.length} linhas`);

  let atualizados = 0;
  let naoEncontrados = 0;
  let semCodigo = 0;
  const naoEncontradosList: string[] = [];

  // Busca todas as variantes do tenant de uma só vez
  const todasVariantes = await prisma.produtoVariante.findMany({
    where: { produto: { tenantId: tenant.id } },
    select: { id: true, codigoBarras: true, produtoId: true },
  });
  const mapaVariantes = new Map(todasVariantes.map((v) => [v.codigoBarras, v]));

  // Prepara updates em batch
  const updatePromises: Promise<unknown>[] = [];

  for (const row of rows) {
    const codigoBarras = row["codigo_barras"]?.trim();
    const qtd = parseInt(row["quantidade_atual"] ?? "0", 10);
    const precoCusto = parseFloat(row["preco_custo"] ?? "0") || null;
    const precoVenda = parseFloat(row["preco_venda"] ?? "0") || null;

    if (!codigoBarras || codigoBarras === "") { semCodigo++; continue; }

    const variante = mapaVariantes.get(codigoBarras);
    if (!variante) {
      naoEncontrados++;
      naoEncontradosList.push(`${codigoBarras} | ${row["nome_produto"]} | ${row["cor"]} | ${row["tamanho"]}`);
      continue;
    }

    updatePromises.push(
      prisma.produtoVariante.update({
        where: { id: variante.id },
        data: {
          qtdEstoque: isNaN(qtd) ? 0 : qtd,
          qtdDisponivel: isNaN(qtd) ? 0 : qtd,
          ...(precoVenda && precoVenda > 0 ? { precoVenda } : {}),
        },
      })
    );

    if (precoCusto && precoCusto > 0) {
      updatePromises.push(
        prisma.produto.update({
          where: { id: variante.produtoId },
          data: {
            precoCusto,
            ...(precoVenda && precoVenda > 0 ? { precoVenda } : {}),
          },
        })
      );
    }

    atualizados++;
  }

  console.log(`🔄 Executando ${updatePromises.length} updates em paralelo...`);
  // Executa em lotes de 50 para não sobrecarregar
  for (let i = 0; i < updatePromises.length; i += 50) {
    await Promise.all(updatePromises.slice(i, i + 50));
    process.stdout.write(`  ${Math.min(i + 50, updatePromises.length)}/${updatePromises.length}\r`);
  }

  console.log(`\n✅ Atualizados: ${atualizados}`);
  console.log(`⚠️  Sem código de barras: ${semCodigo}`);
  console.log(`❌ Não encontrados no banco: ${naoEncontrados}`);

  if (naoEncontradosList.length > 0) {
    console.log(`\n--- Códigos não encontrados (${naoEncontradosList.length}) ---`);
    naoEncontradosList.forEach((l) => console.log("  " + l));
  }

  // Relatório final de calças
  console.log("\n--- RELATÓRIO CALÇAS ---");
  const calcas = await prisma.produtoVariante.findMany({
    where: {
      produto: {
        tenantId: tenant.id,
        OR: [
          { nome: { contains: "calca", mode: "insensitive" } },
          { nome: { contains: "calça", mode: "insensitive" } },
        ],
      },
    },
    select: {
      codigoBarras: true,
      cor: true,
      tamanho: true,
      qtdEstoque: true,
      produto: { select: { nome: true } },
    },
    orderBy: [{ produto: { nome: "asc" } }, { tamanho: "asc" }],
  });

  let totalCalcasEstoque = 0;
  let calcasZero = 0;
  for (const v of calcas) {
    totalCalcasEstoque += v.qtdEstoque;
    if (v.qtdEstoque === 0) calcasZero++;
    const status = v.qtdEstoque > 0 ? `✅ ${v.qtdEstoque}un` : "❌ zerado";
    console.log(`  ${status} | ${v.produto.nome} | ${v.cor ?? ""} | tam ${v.tamanho ?? "—"} | ${v.codigoBarras}`);
  }
  console.log(`\nTotal calças: ${calcas.length} variantes | ${totalCalcasEstoque} unidades | ${calcasZero} zeradas`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
