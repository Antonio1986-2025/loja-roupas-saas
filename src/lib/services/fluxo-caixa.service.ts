import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type Periodo = "7d" | "30d" | "90d" | "ano";

function getDateRange(periodo: Periodo) {
  const now = new Date();
  let start: Date;
  switch (periodo) {
    case "7d": start = new Date(now.getTime() - 7 * 86400000); break;
    case "30d": start = new Date(now.getTime() - 30 * 86400000); break;
    case "90d": start = new Date(now.getTime() - 90 * 86400000); break;
    case "ano": start = new Date(now.getFullYear(), 0, 1); break;
    default: start = new Date(now.getTime() - 30 * 86400000);
  }
  return { start, end: now };
}

export async function getResumo(tenantId: string, periodo: Periodo) {
  const { start, end } = getDateRange(periodo);

  const [totalPendentePagar, totalPendenteReceber, entradas, saidas, vendasPeriodo] =
    await Promise.all([
      prisma.contaPagar.aggregate({
        where: { tenantId, status: "PENDENTE" },
        _sum: { valor: true },
      }),
      prisma.contaReceber.aggregate({
        where: { tenantId, status: "PENDENTE" },
        _sum: { valor: true },
      }),
      prisma.contaReceber.aggregate({
        where: {
          tenantId,
          status: "PAGO",
          dataRecebimento: { gte: start, lte: end },
        },
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: {
          tenantId,
          status: "PAGO",
          dataPagamento: { gte: start, lte: end },
        },
        _sum: { valor: true },
      }),
      prisma.venda.aggregate({
        where: {
          tenantId,
          status: "CONCLUIDA",
          createdAt: { gte: start, lte: end },
        },
        _sum: { total: true },
      }),
    ]);

  return {
    saldoPendente: Number(totalPendenteReceber._sum.valor || 0) - Number(totalPendentePagar._sum.valor || 0),
    totalEntradas: Number(entradas._sum.valor || 0) + Number(vendasPeriodo._sum.total || 0),
    totalSaidas: Number(saidas._sum.valor || 0),
    saldoPeriodo: (Number(entradas._sum.valor || 0) + Number(vendasPeriodo._sum.total || 0)) - Number(saidas._sum.valor || 0),
    totalPendentePagar: Number(totalPendentePagar._sum.valor || 0),
    totalPendenteReceber: Number(totalPendenteReceber._sum.valor || 0),
  };
}

export async function getMovimentacoesRecentes(tenantId: string, limite = 20) {
  const [pagamentos, recebimentos, vendas] = await Promise.all([
    prisma.contaPagar.findMany({
      where: { tenantId, status: "PAGO" },
      select: {
        id: true,
        descricao: true,
        valor: true,
        dataPagamento: true,
      },
      orderBy: { dataPagamento: "desc" },
      take: limite,
    }),
    prisma.contaReceber.findMany({
      where: { tenantId, status: "PAGO" },
      select: {
        id: true,
        descricao: true,
        valor: true,
        dataRecebimento: true,
      },
      orderBy: { dataRecebimento: "desc" },
      take: limite,
    }),
    prisma.venda.findMany({
      where: { tenantId, status: "CONCLUIDA" },
      select: {
        id: true,
        numero: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limite,
    }),
  ]);

  const movimentacoes: { id: string; descricao: string; valor: number; tipo: "ENTRADA" | "SAIDA"; data: Date }[] = [
    ...vendas.map((v) => ({
      id: v.id,
      descricao: `Venda #${v.numero}`,
      valor: Number(v.total),
      tipo: "ENTRADA" as const,
      data: v.createdAt,
    })),
    ...pagamentos.map((p) => ({
      id: p.id,
      descricao: p.descricao,
      valor: Number(p.valor),
      tipo: "SAIDA" as const,
      data: p.dataPagamento!,
    })),
    ...recebimentos.map((r) => ({
      id: r.id,
      descricao: r.descricao,
      valor: Number(r.valor),
      tipo: "ENTRADA" as const,
      data: r.dataRecebimento!,
    })),
  ];

  return movimentacoes
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, limite);
}

export async function listarMovimentacoes(
  tenantId: string,
  opts: { page: number; limit: number; tipo?: string; periodo: Periodo }
) {
  const { start, end } = getDateRange(opts.periodo);

  const wherePagar: Prisma.ContaPagarWhereInput = { tenantId, status: "PAGO", dataPagamento: { gte: start, lte: end } };
  const whereReceber: Prisma.ContaReceberWhereInput = { tenantId, status: "PAGO", dataRecebimento: { gte: start, lte: end } };
  const whereVendas: Prisma.VendaWhereInput = { tenantId, status: "CONCLUIDA", createdAt: { gte: start, lte: end } };

  const [pagamentos, recebimentos, vendas] = await Promise.all([
    prisma.contaPagar.findMany({
      where: wherePagar,
      select: { id: true, descricao: true, valor: true, dataPagamento: true },
    }),
    prisma.contaReceber.findMany({
      where: whereReceber,
      select: { id: true, descricao: true, valor: true, dataRecebimento: true },
    }),
    prisma.venda.findMany({
      where: whereVendas,
      select: { id: true, numero: true, total: true, createdAt: true },
    }),
  ]);

  let movimentacoes: { id: string; descricao: string; valor: number; tipo: "ENTRADA" | "SAIDA"; data: Date }[] = [
    ...vendas.map((v) => ({
      id: v.id,
      descricao: `Venda #${v.numero}`,
      valor: Number(v.total),
      tipo: "ENTRADA" as const,
      data: v.createdAt,
    })),
    ...pagamentos.map((p) => ({
      id: p.id,
      descricao: p.descricao,
      valor: Number(p.valor),
      tipo: "SAIDA" as const,
      data: p.dataPagamento!,
    })),
    ...recebimentos.map((r) => ({
      id: r.id,
      descricao: r.descricao,
      valor: Number(r.valor),
      tipo: "ENTRADA" as const,
      data: r.dataRecebimento!,
    })),
  ];

  if (opts.tipo === "ENTRADA" || opts.tipo === "SAIDA") {
    movimentacoes = movimentacoes.filter((m) => m.tipo === opts.tipo);
  }

  movimentacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const total = movimentacoes.length;
  const skip = (opts.page - 1) * opts.limit;
  const data = movimentacoes.slice(skip, skip + opts.limit);

  return { data, total, page: opts.page, totalPages: Math.ceil(total / opts.limit) };
}

export async function getSaldoAtual(tenantId: string) {
  const [totalPago, totalRecebido] = await Promise.all([
    prisma.contaPagar.aggregate({
      where: { tenantId, status: "PAGO" },
      _sum: { valor: true },
    }),
    prisma.contaReceber.aggregate({
      where: { tenantId, status: "PAGO" },
      _sum: { valor: true },
    }),
  ]);

  return Number(totalRecebido._sum.valor || 0) - Number(totalPago._sum.valor || 0);
}
