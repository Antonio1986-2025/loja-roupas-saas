import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AbrirCaixaInput, FecharCaixaInput, SangriaInput, SuprimentoInput } from "@/lib/validations/caixa";
import { totalizarPagamentosPorForma, totalizarMovimentos, calcularSaldoCaixa, calcularDiferencaCaixa } from "@/lib/calculations/caixa";

export class CaixaError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "CaixaError";
  }
}

export type CaixaAtual = {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  dataAbertura: Date;
  saldoInicial: number;
  status: string;
  totalVendas: number;
  totalDinheiro: number;
  totalPix: number;
  totalDebito: number;
  totalCredito: number;
  totalCreditoLoja: number;
  totalBoleto: number;
  totalSuprimentos: number;
  totalSangrias: number;
  saldoAtual: number;
};

export async function getCaixaAtual(tenantId: string): Promise<CaixaAtual | null> {
  const caixa = await prisma.caixa.findFirst({
    where: { tenantId, status: "ABERTO" },
    include: {
      usuario: { select: { name: true } },
      vendas: {
        where: { status: "CONCLUIDA" },
        include: { pagamentos: true },
      },
      movimentos: {
        where: { tipo: { in: ["SANGRIA", "SUPRIMENTO"] } },
      },
    },
    orderBy: { dataAbertura: "desc" },
  });

  if (!caixa) return null;

  const pagamentos = caixa.vendas.flatMap((v) => v.pagamentos);
  const {
    dinheiro: totalDinheiro,
    pix: totalPix,
    debito: totalDebito,
    credito: totalCredito,
    creditoLoja: totalCreditoLoja,
    boleto: totalBoleto,
  } = totalizarPagamentosPorForma(pagamentos);

  const { suprimentos: totalSuprimentos, sangrias: totalSangrias } = totalizarMovimentos(
    caixa.movimentos
  );

  const saldoAtual = calcularSaldoCaixa(
    caixa.saldoInicial,
    totalDinheiro,
    totalSuprimentos,
    totalSangrias
  );

  return {
    id: caixa.id,
    usuarioId: caixa.usuarioId,
    usuarioNome: caixa.usuario.name,
    dataAbertura: caixa.dataAbertura,
    saldoInicial: Number(caixa.saldoInicial),
    status: caixa.status,
    totalVendas: caixa.vendas.length,
    totalDinheiro,
    totalPix,
    totalDebito,
    totalCredito,
    totalCreditoLoja,
    totalBoleto,
    totalSuprimentos,
    totalSangrias,
    saldoAtual,
  };
}

export async function abrirCaixa(tenantId: string, usuarioId: string, data: AbrirCaixaInput) {
  const aberto = await prisma.caixa.findFirst({
    where: { tenantId, status: "ABERTO" },
  });

  if (aberto) {
    throw new CaixaError("CAIXA_JA_ABERTO", "Já existe um caixa aberto para este tenant");
  }

  return prisma.$transaction(async (tx) => {
    const caixa = await tx.caixa.create({
      data: {
        tenantId,
        usuarioId,
        saldoInicial: data.saldoInicial,
      },
    });

    await tx.caixaMovimento.create({
      data: {
        caixaId: caixa.id,
        tipo: "ABERTURA",
        valor: data.saldoInicial,
        descricao: "Abertura de caixa",
        usuarioId,
      },
    });

    return caixa;
  });
}

export async function fecharCaixa(tenantId: string, caixaId: string, data: FecharCaixaInput) {
  return prisma.$transaction(async (tx) => {
    const caixa = await tx.caixa.findFirst({
      where: { id: caixaId, tenantId },
      include: {
        vendas: {
          where: { status: "CONCLUIDA" },
          include: { pagamentos: true },
        },
        movimentos: {
          where: { tipo: { in: ["SANGRIA", "SUPRIMENTO"] } },
        },
      },
    });

    if (!caixa) throw new CaixaError("CAIXA_NAO_ENCONTRADO", "Caixa não encontrado");
    if (caixa.status !== "ABERTO") throw new CaixaError("CAIXA_FECHADO", "Caixa já está fechado");

    const pagamentos = caixa.vendas.flatMap((v) => v.pagamentos);
    const { dinheiro: totalDinheiro } = totalizarPagamentosPorForma(pagamentos);
    const { suprimentos: totalSuprimentos, sangrias: totalSangrias } = totalizarMovimentos(
      caixa.movimentos
    );

    const saldoFinal = calcularSaldoCaixa(
      caixa.saldoInicial,
      totalDinheiro,
      totalSuprimentos,
      totalSangrias
    );
    const diferenca = calcularDiferencaCaixa(data.saldoReal, saldoFinal);

    await tx.caixa.update({
      where: { id: caixaId },
      data: {
        dataFechamento: new Date(),
        saldoFinal,
        saldoReal: data.saldoReal,
        diferenca,
        status: "FECHADO",
      },
    });

    await tx.caixaMovimento.create({
      data: {
        caixaId,
        tipo: "SUPRIMENTO",
        valor: diferenca > 0 ? diferenca : 0,
        descricao: data.observacoes || `Fechamento de caixa (sobra de ${diferenca.toFixed(2)})`,
      },
    });

    await tx.caixaMovimento.create({
      data: {
        caixaId,
        tipo: "SANGRIA",
        valor: diferenca < 0 ? Math.abs(diferenca) : 0,
        descricao: data.observacoes || `Fechamento de caixa (falta de ${Math.abs(diferenca).toFixed(2)})`,
      },
    });

    return { saldoFinal, saldoReal: data.saldoReal, diferenca };
  });
}

export async function sangria(tenantId: string, caixaId: string, data: SangriaInput, usuarioId: string) {
  const caixa = await prisma.caixa.findFirst({
    where: { id: caixaId, tenantId, status: "ABERTO" },
  });

  if (!caixa) throw new CaixaError("CAIXA_NAO_ABERTO", "Caixa não está aberto");

  return prisma.caixaMovimento.create({
    data: {
      caixaId,
      tipo: "SANGRIA",
      valor: data.valor,
      descricao: data.descricao,
      usuarioId,
    },
  });
}

export async function suprimento(tenantId: string, caixaId: string, data: SuprimentoInput, usuarioId: string) {
  const caixa = await prisma.caixa.findFirst({
    where: { id: caixaId, tenantId, status: "ABERTO" },
  });

  if (!caixa) throw new CaixaError("CAIXA_NAO_ABERTO", "Caixa não está aberto");

  return prisma.caixaMovimento.create({
    data: {
      caixaId,
      tipo: "SUPRIMENTO",
      valor: data.valor,
      descricao: data.descricao,
      usuarioId,
    },
  });
}

export async function listarCaixas(tenantId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.caixa.findMany({
      where: { tenantId, status: "FECHADO" },
      include: {
        usuario: { select: { name: true } },
        _count: { select: { vendas: true, movimentos: true } },
      },
      orderBy: { dataFechamento: "desc" },
      skip,
      take: limit,
    }),
    prisma.caixa.count({ where: { tenantId, status: "FECHADO" } }),
  ]);

  return {
    data: data.map((c) => ({
      id: c.id,
      usuarioNome: c.usuario.name,
      dataAbertura: c.dataAbertura,
      dataFechamento: c.dataFechamento!,
      saldoInicial: Number(c.saldoInicial),
      saldoFinal: c.saldoFinal ? Number(c.saldoFinal) : null,
      saldoReal: c.saldoReal ? Number(c.saldoReal) : null,
      diferenca: c.diferenca ? Number(c.diferenca) : null,
      totalVendas: c._count.vendas,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getMovimentos(caixaId: string, tenantId: string) {
  const caixa = await prisma.caixa.findFirst({
    where: { id: caixaId, tenantId },
  });

  if (!caixa) throw new CaixaError("CAIXA_NAO_ENCONTRADO", "Caixa não encontrado");

  return prisma.caixaMovimento.findMany({
    where: { caixaId },
    include: {
      venda: { select: { numero: true } },
      usuario: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
