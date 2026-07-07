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

  const [totalPendente, totalVencido, venceHoje, venceSemana, pagoMes] = await Promise.all([
    prisma.contaPagar.aggregate({
      where: { tenantId, status: "PENDENTE" },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { tenantId, status: "PENDENTE", dataVencimento: { lt: agora } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
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
    prisma.contaPagar.aggregate({
      where: { tenantId, status: "PENDENTE", dataVencimento: { gte: agora, lte: em7dias } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { tenantId, status: "PAGO", dataPagamento: { gte: inicioMes, lte: fimMes } },
      _sum: { valorPago: true, valor: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    totalPendente: Number(totalPendente._sum.valor ?? 0),
    qtdPendente: totalPendente._count,
    totalVencido: Number(totalVencido._sum.valor ?? 0),
    qtdVencido: totalVencido._count,
    venceHoje: Number(venceHoje._sum.valor ?? 0),
    qtdVenceHoje: venceHoje._count,
    venceSemana: Number(venceSemana._sum.valor ?? 0),
    qtdVenceSemana: venceSemana._count,
    pagoMes: Number(pagoMes._sum.valorPago ?? pagoMes._sum.valor ?? 0),
    qtdPagoMes: pagoMes._count,
  });
}
