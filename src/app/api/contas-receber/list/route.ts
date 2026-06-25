import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status") || "";
  const categoria = url.searchParams.get("categoria") || "";
  const formaPagamento = url.searchParams.get("formaPagamento") || "";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate = url.searchParams.get("endDate") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { tenantId: session.user.tenantId };

  if (q) {
    where.descricao = { contains: q, mode: "insensitive" };
  }

  if (status === "PENDENTE" || status === "PAGO") {
    where.status = status;
  }

  if (categoria) {
    where.categoria = categoria;
  }

  if (formaPagamento) {
    where.formaPagamento = formaPagamento;
  }

  if (startDate || endDate) {
    where.dataVencimento = {};
    if (startDate) where.dataVencimento.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.dataVencimento.lte = end;
    }
  }

  try {
    const [contas, total] = await Promise.all([
      prisma.contaReceber.findMany({
        where,
        include: { cliente: { select: { id: true, nome: true } } },
        orderBy: [{ status: "asc" }, { dataVencimento: "asc" }],
        skip,
        take: limit,
      }),
      prisma.contaReceber.count({ where }),
    ]);

    const data = contas.map((c) => ({
      id: c.id,
      descricao: c.descricao,
      valor: Number(c.valor),
      dataVencimento: c.dataVencimento,
      dataRecebimento: c.dataRecebimento,
      status: c.status,
      categoria: c.categoria,
      formaPagamento: c.formaPagamento,
      observacoes: c.observacoes,
      cliente: c.cliente,
      vendaId: c.vendaId,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[GET /api/contas-receber/list]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
