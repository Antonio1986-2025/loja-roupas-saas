/**
 * Sincroniza o estoque do sistema Lovable com o banco do Stori SaaS.
 *
 * Estratégia de matching (em ordem de prioridade):
 *   1. codigo_barras  → codigoBarras na variante
 *   2. codigo_interno + cor + tamanho → codigoInterno + cor + tamanho na variante
 *
 * O que é atualizado:
 *   - qtdEstoque      ← quantidade_atual do CSV
 *   - qtdDisponivel   ← quantidade_atual (respeitando qtdCondicional reservada)
 *   - precoCusto      ← preco_custo (se preenchido)
 *   - precoVenda      ← preco_venda (se preenchido)
 *
 * Uma movimentação de estoque (tipo AJUSTE) é registrada para cada variante alterada.
 *
 * Uso:
 *   TENANT_SLUG=california npx tsx prisma/sync-estoque.ts ./imports/estoque-2026-06-27.csv
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import prisma from "../src/lib/prisma";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface CsvRow {
  codigo_interno: string;
  codigo_fornecedor: string;
  nome_produto: string;
  categoria: string;
  marca: string;
  genero: string;
  cor: string;
  tamanho: string;
  codigo_barras: string;
  quantidade_atual: string;
  preco_custo: string;
  preco_venda: string;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const tenantSlug = process.env.TENANT_SLUG;
  const csvPath = process.argv[2];

  if (!tenantSlug) {
    console.error("❌  Defina TENANT_SLUG. Ex: TENANT_SLUG=california npx tsx prisma/sync-estoque.ts ./imports/estoque.csv");
    process.exit(1);
  }
  if (!csvPath || !fs.existsSync(path.resolve(csvPath))) {
    console.error("❌  Arquivo CSV não encontrado:", csvPath);
    process.exit(1);
  }

  // Resolver tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    console.error(`❌  Tenant "${tenantSlug}" não encontrado.`);
    process.exit(1);
  }
  console.log(`✅  Tenant: ${tenant.name}`);

  // Ler CSV
  const content = fs.readFileSync(path.resolve(csvPath), "utf-8")
    // Remove BOM se houver
    .replace(/^\uFEFF/, "");

  const rows: CsvRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  });

  console.log(`📄  ${rows.length} linhas no CSV\n`);

  // Carregar todas as variantes do tenant de uma vez (evita N queries)
  const variantes = await prisma.produtoVariante.findMany({
    where: { produto: { tenantId: tenant.id } },
    select: {
      id: true,
      codigoBarras: true,
      codigoInterno: true,
      cor: true,
      tamanho: true,
      qtdEstoque: true,
      qtdDisponivel: true,
      qtdCondicional: true,
    },
  });

  // Mapas para lookup rápido
  const porCodigoBarras = new Map(variantes.map((v) => [v.codigoBarras?.trim(), v]));
  const porChaveComposta = new Map(
    variantes.map((v) => {
      const chave = [
        v.codigoInterno?.trim()?.toLowerCase() ?? "",
        v.cor?.trim()?.toLowerCase() ?? "",
        v.tamanho?.trim()?.toLowerCase() ?? "",
      ].join("|");
      return [chave, v];
    })
  );

  let atualizados = 0;
  let naoEncontrados = 0;
  let semAlteracao = 0;
  const naoEncontradosLista: string[] = [];

  for (const row of rows) {
    const qtdNova = parseInt(row.quantidade_atual) || 0;
    const precoCusto = parseFloat(row.preco_custo) || null;
    const precoVenda = parseFloat(row.preco_venda) || null;

    // 1. Tentar por código de barras
    let variante = porCodigoBarras.get(row.codigo_barras?.trim());

    // 2. Fallback: código interno + cor + tamanho
    if (!variante && row.codigo_interno) {
      const chave = [
        row.codigo_interno.trim().toLowerCase(),
        row.cor.trim().toLowerCase(),
        row.tamanho.trim().toLowerCase(),
      ].join("|");
      variante = porChaveComposta.get(chave);
    }

    if (!variante) {
      naoEncontrados++;
      naoEncontradosLista.push(
        `  - ${row.nome_produto} | CB: ${row.codigo_barras || "—"} | Cód: ${row.codigo_interno || "—"} | ${row.cor} ${row.tamanho}`
      );
      continue;
    }

    const qtdAtual = variante.qtdEstoque;

    // Sem alteração → pula
    if (qtdAtual === qtdNova && !precoCusto && !precoVenda) {
      semAlteracao++;
      continue;
    }

    // Calcular disponível respeitando condicional em aberto
    const qtdCondicional = variante.qtdCondicional ?? 0;
    const qtdDisponivelNova = Math.max(0, qtdNova - qtdCondicional);

    try {
      await prisma.$transaction([
        // Atualizar quantidades da variante
        prisma.produtoVariante.update({
          where: { id: variante.id },
          data: {
            qtdEstoque: qtdNova,
            qtdDisponivel: qtdDisponivelNova,
            ...(precoVenda ? { precoVenda } : {}),
          },
        }),
        // Registrar movimentação de ajuste
        prisma.movimentacaoEstoque.create({
          data: {
            varianteId: variante.id,
            tipo: "AJUSTE",
            quantidade: qtdNova - qtdAtual,
            observacao: `Sincronização Lovable → Stori (${new Date().toLocaleDateString("pt-BR")})`,
          },
        }),
      ]);

      atualizados++;

      if (atualizados % 50 === 0) {
        console.log(`   → ${atualizados} variantes atualizadas...`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌  Erro ao atualizar "${row.nome_produto}" (${row.codigo_barras}): ${msg}`);
    }
  }

  // ── Relatório ──────────────────────────────
  console.log("\n══════════════════════════════════════════");
  console.log(`✅  Atualizadas:     ${atualizados}`);
  console.log(`⏭️   Sem alteração:   ${semAlteracao}`);
  console.log(`❌  Não encontradas: ${naoEncontrados}`);
  console.log("══════════════════════════════════════════");

  if (naoEncontradosLista.length > 0) {
    console.log("\n⚠️  Variantes do CSV sem correspondência no banco:");
    naoEncontradosLista.slice(0, 30).forEach((l) => console.log(l));
    if (naoEncontradosLista.length > 30) {
      console.log(`   ... e mais ${naoEncontradosLista.length - 30} itens.`);
    }
    console.log("\n💡  Dica: essas variantes podem não existir ainda no Stori.");
    console.log("    Use o script de importação de produtos para criá-las primeiro.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
