import prisma from "@/lib/prisma";
import { parse } from "csv-parse/sync";
import fs from "fs";
import type { Genero } from "@prisma/client";

function converterUrlGoogleDrive(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([^\/]+)/);
  if (match) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
}

interface ImportRow {
  codigo_interno: string;
  codigo_fornecedor: string;
  categoria: string;
  marca: string;
  descricao: string;
  genero: string;
  tamanho: string;
  cor: string;
  quantidade: string;
  preco_custo: string;
  preco_venda: string;
  foto_url: string;
}

interface ImportResult {
  categoriasCriadas: number;
  produtosCriados: number;
  variantesCriadas: number;
  produtosPulados: number;
  variantesPuladas: number;
  estoqueTotal: number;
  erros: string[];
}

export async function importarProdutos(
  tenantId: string,
  csvPath: string
): Promise<ImportResult> {
  const content = fs.readFileSync(csvPath, "utf-8");
  const records: ImportRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: ImportResult = {
    categoriasCriadas: 0,
    produtosCriados: 0,
    variantesCriadas: 0,
    produtosPulados: 0,
    variantesPuladas: 0,
    estoqueTotal: 0,
    erros: [],
  };

  // Agrupar por codigo_interno
  const produtosMap = new Map<string, ImportRow[]>();
  for (const row of records) {
    const cod = row.codigo_interno;
    if (!produtosMap.has(cod)) {
      produtosMap.set(cod, []);
    }
    produtosMap.get(cod)!.push(row);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Criar categorias que nao existem
    const categoriasExistentes = await tx.categoria.findMany({
      where: { tenantId },
      select: { nome: true, id: true },
    });

    const mapaCategorias = new Map<string, string>();
    for (const c of categoriasExistentes) {
      mapaCategorias.set(c.nome.toUpperCase(), c.id);
    }

    const categoriasNovas = new Set<string>();
    for (const rows of produtosMap.values()) {
      const cat = rows[0].categoria;
      if (cat && !mapaCategorias.has(cat.toUpperCase())) {
        categoriasNovas.add(cat);
      }
    }

    for (const catNome of categoriasNovas) {
      const slug = catNome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const novaCategoria = await tx.categoria.create({
        data: {
          nome: catNome,
          slug,
          tenantId,
        },
      });
      mapaCategorias.set(catNome.toUpperCase(), novaCategoria.id);
      result.categoriasCriadas++;
    }

    // 2. Verificar produtos existentes pelos codigos internos
    const codigosInternos = Array.from(produtosMap.keys()).filter(Boolean);
    const produtosExistentes = codigosInternos.length > 0
      ? await tx.produto.findMany({
          where: { tenantId, codigoInterno: { in: codigosInternos } },
          select: { codigoInterno: true },
        })
      : [];
    const conjuntoCodigosExistentes = new Set(produtosExistentes.map((p) => p.codigoInterno).filter(Boolean));

    // 3. Criar produtos e variantes (pulando duplicatas)
    for (const [codInterno, rows] of produtosMap) {
      if (codInterno && conjuntoCodigosExistentes.has(codInterno)) {
        result.produtosPulados++;
        result.variantesPuladas += rows.length;
        continue;
      }

      const primeiro = rows[0];
      const categoriaId = mapaCategorias.get(primeiro.categoria.toUpperCase()) || null;

      const produto = await tx.produto.create({
        data: {
          nome: primeiro.descricao,
          descricao: primeiro.descricao,
          codigoInterno: codInterno || null,
          codigoFornecedor: primeiro.codigo_fornecedor || null,
          marca: primeiro.marca || null,
          genero: (primeiro.genero as Genero) || null,
          precoVenda: parseFloat(primeiro.preco_venda) || 0,
          precoCusto: parseFloat(primeiro.preco_custo) || 0,
          fotoUrl: converterUrlGoogleDrive(primeiro.foto_url) || null,
          ativo: true,
          categoriaId,
          fornecedorId: null,
          tenantId,
        },
      });

      result.produtosCriados++;

      // Criar variantes
      let vi = 0;
      for (const row of rows) {
        vi++;
        const tamanho = row.tamanho || null;
        const cor = row.cor || null;
        const quantidade = parseInt(row.quantidade) || 0;

        // Gerar codigo de barras unico
        const codigoBarras = `${codInterno}-${vi}${tamanho ? "-" + tamanho : ""}${cor ? "-" + cor.replace(/\s/g, "") : ""}`;

        const variante = await tx.produtoVariante.create({
          data: {
            produtoId: produto.id,
            cor,
            tamanho,
            codigoBarras,
            codigoInterno: codInterno || null,
            codigoFornecedor: primeiro.codigo_fornecedor || null,
            precoVenda: parseFloat(primeiro.preco_venda) || null,
            estoqueMinimo: 0,
            qtdEstoque: quantidade,
            qtdDisponivel: quantidade,
          },
        });

        result.variantesCriadas++;
        result.estoqueTotal += quantidade;

        // Criar movimentacao de estoque
        if (quantidade > 0) {
          await tx.movimentacaoEstoque.create({
            data: {
              varianteId: variante.id,
              tipo: "ENTRADA",
              quantidade,
              observacao: "Importacao de planilha Excel",
            },
          });
        }
      }
    }

    return result;
  }, { timeout: 120000 });
}

export async function importarProdutosDoCSV(
  tenantId: string,
  csvContent: string
): Promise<ImportResult> {
  const records: ImportRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: ImportResult = {
    categoriasCriadas: 0,
    produtosCriados: 0,
    variantesCriadas: 0,
    produtosPulados: 0,
    variantesPuladas: 0,
    estoqueTotal: 0,
    erros: [],
  };

  // Agrupar por codigo_interno
  const produtosMap = new Map<string, ImportRow[]>();
  for (const row of records) {
    const cod = row.codigo_interno;
    if (!produtosMap.has(cod)) {
      produtosMap.set(cod, []);
    }
    produtosMap.get(cod)!.push(row);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Criar categorias que nao existem
    const categoriasExistentes = await tx.categoria.findMany({
      where: { tenantId },
      select: { nome: true, id: true },
    });

    const mapaCategorias = new Map<string, string>();
    for (const c of categoriasExistentes) {
      mapaCategorias.set(c.nome.toUpperCase(), c.id);
    }

    const categoriasNovas = new Set<string>();
    for (const rows of produtosMap.values()) {
      const cat = rows[0].categoria;
      if (cat && !mapaCategorias.has(cat.toUpperCase())) {
        categoriasNovas.add(cat);
      }
    }

    for (const catNome of categoriasNovas) {
      const slug = catNome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const novaCategoria = await tx.categoria.create({
        data: {
          nome: catNome,
          slug,
          tenantId,
        },
      });
      mapaCategorias.set(catNome.toUpperCase(), novaCategoria.id);
      result.categoriasCriadas++;
    }

    // 2. Verificar produtos existentes pelos codigos internos
    const codigosInternos = Array.from(produtosMap.keys()).filter(Boolean);
    const produtosExistentes = codigosInternos.length > 0
      ? await tx.produto.findMany({
          where: { tenantId, codigoInterno: { in: codigosInternos } },
          select: { codigoInterno: true },
        })
      : [];
    const conjuntoCodigosExistentes = new Set(produtosExistentes.map((p) => p.codigoInterno).filter(Boolean));

    // 3. Criar produtos e variantes (pulando duplicatas)
    for (const [codInterno, rows] of produtosMap) {
      if (codInterno && conjuntoCodigosExistentes.has(codInterno)) {
        result.produtosPulados++;
        result.variantesPuladas += rows.length;
        continue;
      }

      const primeiro = rows[0];
      const categoriaId = mapaCategorias.get(primeiro.categoria.toUpperCase()) || null;

      const produto = await tx.produto.create({
        data: {
          nome: primeiro.descricao,
          descricao: primeiro.descricao,
          codigoInterno: codInterno || null,
          codigoFornecedor: primeiro.codigo_fornecedor || null,
          marca: primeiro.marca || null,
          genero: (primeiro.genero as Genero) || null,
          precoVenda: parseFloat(primeiro.preco_venda) || 0,
          precoCusto: parseFloat(primeiro.preco_custo) || 0,
          fotoUrl: converterUrlGoogleDrive(primeiro.foto_url) || null,
          ativo: true,
          categoriaId,
          fornecedorId: null,
          tenantId,
        },
      });

      result.produtosCriados++;

      // Criar variantes
      let vi = 0;
      for (const row of rows) {
        vi++;
        const tamanho = row.tamanho || null;
        const cor = row.cor || null;
        const quantidade = parseInt(row.quantidade) || 0;

        // Gerar codigo de barras unico
        const codigoBarras = `${codInterno}-${vi}${tamanho ? "-" + tamanho : ""}${cor ? "-" + cor.replace(/\s/g, "") : ""}`;

        const variante = await tx.produtoVariante.create({
          data: {
            produtoId: produto.id,
            cor,
            tamanho,
            codigoBarras,
            codigoInterno: codInterno || null,
            codigoFornecedor: primeiro.codigo_fornecedor || null,
            precoVenda: parseFloat(primeiro.preco_venda) || null,
            estoqueMinimo: 0,
            qtdEstoque: quantidade,
            qtdDisponivel: quantidade,
          },
        });

        result.variantesCriadas++;
        result.estoqueTotal += quantidade;

        // Criar movimentacao de estoque
        if (quantidade > 0) {
          await tx.movimentacaoEstoque.create({
            data: {
              varianteId: variante.id,
              tipo: "ENTRADA",
              quantidade,
              observacao: "Importacao de planilha Excel",
            },
          });
        }
      }
    }

    return result;
  }, { timeout: 120000 });
}
