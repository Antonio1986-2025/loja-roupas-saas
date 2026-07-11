import prisma from "@/lib/prisma";

export type Periodo = "hoje" | "7d" | "30d" | "90d" | "ano";

function getDateRange(periodo: Periodo) {
  const now = new Date();
  let start: Date;

  switch (periodo) {
    case "hoje":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "ano":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end: now };
}

export async function getResumo(tenantId: string, periodo: Periodo) {
  const { start, end } = getDateRange(periodo);

  const [totalVendas, totalReceita, totalClientes, totalProdutos, condicionaisAtivas] =
    await Promise.all([
      prisma.venda.count({
        where: {
          tenantId,
          status: "CONCLUIDA",
          createdAt: { gte: start, lte: end },
        },
      }),

      prisma.venda.aggregate({
        where: {
          tenantId,
          status: "CONCLUIDA",
          createdAt: { gte: start, lte: end },
        },
        _sum: { total: true },
      }),

      prisma.cliente.count({ where: { tenantId } }),

      prisma.produto.count({ where: { tenantId, ativo: true } }),

      prisma.vendaCondicional.count({
        where: { tenantId, status: "ATIVA" },
      }),
    ]);

  return {
    totalVendas,
    totalReceita: Number(totalReceita._sum.total || 0),
    totalClientes,
    totalProdutos,
    condicionaisAtivas,
  };
}

export async function getVendasPorDia(tenantId: string, periodo: Periodo) {
  const { start, end } = getDateRange(periodo);

  const vendas = await prisma.venda.findMany({
    where: {
      tenantId,
      status: "CONCLUIDA",
      createdAt: { gte: start, lte: end },
    },
    select: {
      createdAt: true,
      total: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const agrupado: Record<string, number> = {};

  for (const venda of vendas) {
    const dia = venda.createdAt.toISOString().split("T")[0];
    agrupado[dia] = (agrupado[dia] || 0) + Number(venda.total);
  }

  return Object.entries(agrupado).map(([dia, total]) => ({
    dia,
    total,
  }));
}

export async function getVendasPorPagamento(tenantId: string, periodo: Periodo) {
  const { start, end } = getDateRange(periodo);

  const vendas = await prisma.venda.findMany({
    where: {
      tenantId,
      status: "CONCLUIDA",
      createdAt: { gte: start, lte: end },
    },
    select: {
      formaPagamento: true,
      total: true,
    },
  });

  const agrupado: Record<string, number> = {};

  for (const venda of vendas) {
    const chave = venda.formaPagamento;
    agrupado[chave] = (agrupado[chave] || 0) + Number(venda.total);
  }

  return Object.entries(agrupado).map(([forma, total]) => ({
    forma,
    total,
  }));
}

export async function getProdutosMaisVendidos(tenantId: string, periodo: Periodo, limite = 10) {
  const { start, end } = getDateRange(periodo);

  const itens = await prisma.vendaItem.findMany({
    where: {
      venda: {
        tenantId,
        status: "CONCLUIDA",
        createdAt: { gte: start, lte: end },
      },
    },
    select: {
      quantidade: true,
      subtotal: true,
      varianteId: true,
      variante: {
        select: {
          id: true,
          cor: true,
          tamanho: true,
          produto: {
            select: { nome: true },
          },
        },
      },
    },
  });

  const agrupado: Record<string, { nome: string; quantidade: number; total: number }> = {};

  for (const item of itens) {
    const nomeProduto = item.variante.produto.nome;
    const variante = item.variante;
    const detalhes = [variante.cor, variante.tamanho].filter(Boolean).join(" - ");
    const nomeVariante = detalhes ? `${nomeProduto} (${detalhes})` : nomeProduto;
    const chave = item.varianteId;

    if (!agrupado[chave]) {
      agrupado[chave] = { nome: nomeVariante, quantidade: 0, total: 0 };
    }

    agrupado[chave].quantidade += item.quantidade;
    agrupado[chave].total += Number(item.subtotal);
  }

  return Object.values(agrupado)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, limite);
}

export async function getLucro(tenantId: string, periodo: Periodo) {
  const { start, end } = getDateRange(periodo);

  const [totalReceita, itens, despesasAgg] = await Promise.all([
    prisma.venda.aggregate({
      where: {
        tenantId,
        status: "CONCLUIDA",
        createdAt: { gte: start, lte: end },
      },
      _sum: { total: true },
    }),

    prisma.vendaItem.findMany({
      where: {
        venda: {
          tenantId,
          status: "CONCLUIDA",
          createdAt: { gte: start, lte: end },
        },
      },
      select: {
        quantidade: true,
        variante: {
          select: {
            produto: {
              select: { precoCusto: true },
            },
          },
        },
      },
    }),

    prisma.contaPagar.aggregate({
      where: {
        tenantId,
        status: "PAGO",
        dataPagamento: { gte: start, lte: end },
      },
      _sum: { valor: true },
    }),
  ]);

  const faturamento = Number(totalReceita._sum.total || 0);

  const custoProdutos = itens.reduce((sum, item) => {
    const custo = Number(item.variante.produto.precoCusto || 0);
    return sum + custo * item.quantidade;
  }, 0);

  const despesas = Number(despesasAgg._sum.valor || 0);
  const lucroBruto = faturamento - custoProdutos;
  const lucroLiquido = lucroBruto - despesas;

  return { faturamento, custoProdutos, despesas, lucroBruto, lucroLiquido };
}

export async function getCondicionaisResumo(tenantId: string) {
  const [ativas, vencidas, finalizadas, canceladas] = await Promise.all([
    prisma.vendaCondicional.count({
      where: { tenantId, status: "ATIVA", dataVencimento: { gte: new Date() } },
    }),
    prisma.vendaCondicional.count({
      where: { tenantId, status: "ATIVA", dataVencimento: { lt: new Date() } },
    }),
    prisma.vendaCondicional.count({
      where: { tenantId, status: "FINALIZADA" },
    }),
    prisma.vendaCondicional.count({
      where: { tenantId, status: "CANCELADA" },
    }),
  ]);

  return { ativas, vencidas, finalizadas, canceladas };
}
