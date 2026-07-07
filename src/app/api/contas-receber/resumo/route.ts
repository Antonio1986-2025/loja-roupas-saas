import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
  const em7dias = new Date(agora);
  em7dias.setDate(em7dias.getDate() + 7);

  const [
    totalPendente,
    totalVencido,
    venceHoje,
    venceSemana,
    recebidoMes,
    pendentePorFaixa,
  ] = await Promise.all([
    // Total a receber (pendentes)
    prisma.contaReceber.aggregate({
      where: { tenantId, status: "PENDENTE" },
      _sum: { valor: true },
      _count: true,
    }),

    // Total vencido (pendente e dataVencimento < hoje)
    prisma.contaReceber.aggregate({
      where: { tenantId, status: "PENDENTE", dataVencimento: { lt: agora } },
      _sum: { valor: true },
      _count: true,
    }),

    // Vence hoje
    prisma.contaReceber.aggregate({
      where: {
        tenantId,
        status: "PENDENTE",
        dataVencimento: {
          gte: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()),
          lte: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59),
        },
      },
      _sum: { valor: true },
      _count: true,
    }),

    // Vence nos próximos 7 dias (sem contar vencidas)
    prisma.contaReceber.aggregate({
      where: {
        tenantId,
        status: "PENDENTE",
        dataVencimento: { gte: agora, lte: em7dias },
      },
      _sum: { valor: true },
      _count: true,
    }),

    // Recebido no mês atual
    prisma.contaReceber.aggregate({
      where: {
        tenantId,
        status: "PAGO",
        dataRecebimento: { gte: inicioMes, lte: fimMes },
      },
      _sum: { valorRecebido: true, valor: true },
      _count: true,
    }),

    // Aging por faixas (vencidas)
    prisma.$queryRaw<{ faixa: string; total: number; qtd: number }[]>`
      SELECT
        CASE
          WHEN EXTRACT(DAY FROM (NOW() - "dataVencimento")) BETWEEN 1 AND 30  THEN '1-30'
          WHEN EXTRACT(DAY FROM (NOW() - "dataVencimento")) BETWEEN 31 AND 60 THEN '31-60'
          WHEN EXTRACT(DAY FROM (NOW() - "dataVencimento")) BETWEEN 61 AND 90 THEN '61-90'
          WHEN EXTRACT(DAY FROM (NOW() - "dataVencimento")) > 90             THEN '+90'
          ELSE 'ok'
        END as faixa,
        SUM(valor)::float as total,
        COUNT(*)::int as qtd
      FROM "contas_receber"
      WHERE "tenantId" = ${tenantId}
        AND status = 'PENDENTE'
        AND "dataVencimento" < NOW()
      GROUP BY faixa
    `,
  ]);

  const aging = { "1-30": 0, "31-60": 0, "61-90": 0, "+90": 0 };
  const agingQtd = { "1-30": 0, "31-60": 0, "61-90": 0, "+90": 0 };
  for (const row of pendentePorFaixa) {
    if (row.faixa !== "ok") {
      aging[row.faixa as keyof typeof aging] = row.total;
      agingQtd[row.faixa as keyof typeof agingQtd] = row.qtd;
    }
  }

  const totalPendenteValor = Number(totalPendente._sum.valor ?? 0);
  const totalVencidoValor = Number(totalVencido._sum.valor ?? 0);
  const taxaInadimplencia = totalPendenteValor > 0
    ? (totalVencidoValor / totalPendenteValor) * 100
    : 0;

  return NextResponse.json({
    totalPendente: totalPendenteValor,
    qtdPendente: totalPendente._count,
    totalVencido: totalVencidoValor,
    qtdVencido: totalVencido._count,
    venceHoje: Number(venceHoje._sum.valor ?? 0),
    qtdVenceHoje: venceHoje._count,
    venceSemana: Number(venceSemana._sum.valor ?? 0),
    qtdVenceSemana: venceSemana._count,
    recebidoMes: Number(recebidoMes._sum.valorRecebido ?? recebidoMes._sum.valor ?? 0),
    qtdRecebidoMes: recebidoMes._count,
    taxaInadimplencia: Math.round(taxaInadimplencia * 10) / 10,
    aging,
    agingQtd,
  });
}
