import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Genero } from "@prisma/client";
import { calcularSituacaoEstoque, calcularAjusteEstoque, calcularValorEstoque, calcularTotalUnidades } from "@/lib/calculations/estoque";

export class EstoqueError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "EstoqueError";
  }
}

type ListarFiltros = {
  page: number;
  limit: number;
  q?: string;
  categoriaId?: string;
  genero?: string;
  situacao?: "baixo" | "zerado" | "normal" | "excesso";
};

export async function listarEstoque(tenantId: string, filtros: ListarFiltros) {
  const { page, limit, q, categoriaId, genero, situacao } = filtros;
  const skip = (page - 1) * limit;

  const produtoWhere: Prisma.ProdutoWhereInput = { tenantId };
  const whereVar: Prisma.ProdutoVarianteWhereInput = { produto: produtoWhere };

  if (q) {
    const words = q.split(/\s+/).filter(Boolean);
    whereVar.AND = words.map((word) => ({
      OR: [
        { codigoBarras: { contains: word, mode: "insensitive" } },
        { codigoInterno: { contains: word, mode: "insensitive" } },
        { produto: { nome: { contains: word, mode: "insensitive" } } },
        { produto: { descricao: { contains: word, mode: "insensitive" } } },
      ],
    }));
  }
  if (categoriaId) {
    produtoWhere.categoriaId = categoriaId;
  }
  if (genero) {
    produtoWhere.genero = genero as Genero;
  }
  if (situacao === "zerado") {
    whereVar.qtdEstoque = 0;
  }
  if (situacao === "excesso") {
    whereVar.qtdEstoque = { gt: 50 };
  }

  const [variantes, total] = await Promise.all([
    prisma.produtoVariante.findMany({
      where: whereVar,
      include: {
        produto: {
          include: { categoria: { select: { nome: true } } },
        },
      },
      orderBy: [
        { qtdEstoque: "asc" },
        { produto: { nome: "asc" } },
        { cor: "asc" },
        { tamanho: "asc" },
      ],
      skip,
      take: limit,
    }),
    prisma.produtoVariante.count({ where: whereVar }),
  ]);

  const data = variantes.map((v) => ({
    id: v.id,
    produtoId: v.produtoId,
    produtoNome: v.produto.nome,
    categoriaNome: v.produto.categoria?.nome || null,
    cor: v.cor,
    tamanho: v.tamanho,
    codigoBarras: v.codigoBarras,
    qtdEstoque: v.qtdEstoque,
    qtdDisponivel: v.qtdDisponivel,
    qtdCondicional: v.qtdCondicional,
    estoqueMinimo: v.estoqueMinimo,
    precoVenda: v.precoVenda ? Number(v.precoVenda) : Number(v.produto.precoVenda),
    situacao: calcularSituacaoEstoque(v.qtdEstoque, v.estoqueMinimo),
  }));

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export async function buscarVariante(tenantId: string, varianteId: string) {
  const variante = await prisma.produtoVariante.findFirst({
    where: { id: varianteId, produto: { tenantId } },
    include: {
      produto: { include: { categoria: true } },
    },
  });

  if (!variante) {
    throw new EstoqueError("NAO_ENCONTRADA", "Variação não encontrada");
  }

  return variante;
}

export async function ajustarEstoque(
  tenantId: string,
  varianteId: string,
  dados: { quantidade: number; motivo: string; observacao?: string },
  usuarioId: string
) {
  const variante = await buscarVariante(tenantId, varianteId);

  if (dados.quantidade < 0) {
    throw new EstoqueError("QUANTIDADE_INVALIDA", "Quantidade não pode ser negativa");
  }

  if (!dados.motivo?.trim()) {
    throw new EstoqueError("MOTIMO_OBRIGATORIO", "Motivo é obrigatório");
  }

  return prisma.$transaction(async (tx) => {
    const { diferenca, qtdDisponivelNova } = calcularAjusteEstoque(
      variante.qtdEstoque,
      variante.qtdDisponivel,
      dados.quantidade
    );

    await tx.produtoVariante.update({
      where: { id: varianteId },
      data: {
        qtdEstoque: dados.quantidade,
        qtdDisponivel: qtdDisponivelNova,
      },
    });

    const movimento = await tx.movimentacaoEstoque.create({
      data: {
        varianteId,
        tipo: "AJUSTE",
        quantidade: diferenca,
        observacao: `${dados.motivo}${dados.observacao ? ` — ${dados.observacao}` : ""}`,
      },
    });

    return movimento;
  });
}

export async function listarMovimentos(varianteId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [movimentos, total] = await Promise.all([
    prisma.movimentacaoEstoque.findMany({
      where: { varianteId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.movimentacaoEstoque.count({ where: { varianteId } }),
  ]);

  return {
    data: movimentos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      quantidade: m.quantidade,
      observacao: m.observacao,
      createdAt: m.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function obterResumo(tenantId: string) {
  const variantes = await prisma.produtoVariante.findMany({
    where: { produto: { tenantId } },
    include: {
      produto: {
        include: { categoria: { select: { nome: true } } },
      },
    },
  });

  const totalUnidades = calcularTotalUnidades(variantes);
  const valorTotal = calcularValorEstoque(
    variantes.map((v) => ({
      qtdEstoque: v.qtdEstoque,
      precoVenda: Number(v.precoVenda || v.produto.precoVenda),
    }))
  );
  const valorCusto = variantes.reduce((acc, v) => {
    const custo = Number(v.produto.precoCusto ?? 0);
    return acc + custo * v.qtdEstoque;
  }, 0);
  const totalBaixo = variantes.filter(
    (v) => v.qtdEstoque > 0 && v.qtdEstoque <= v.estoqueMinimo
  ).length;
  const totalZerado = variantes.filter((v) => v.qtdEstoque === 0).length;

  const categorias: Record<string, { nome: string; total: number }> = {};
  for (const v of variantes) {
    const nome = v.produto.categoria?.nome || "Sem categoria";
    if (!categorias[nome]) categorias[nome] = { nome, total: 0 };
    categorias[nome].total += v.qtdEstoque;
  }

  return {
    totalUnidades,
    valorTotal,
    valorCusto,
    totalVariantes: variantes.length,
    totalBaixo,
    totalZerado,
    categorias: Object.values(categorias).sort((a, b) => b.total - a.total),
  };
}
