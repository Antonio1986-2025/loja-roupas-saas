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
  const q        = url.searchParams.get("q")?.trim() || "";
  const status   = url.searchParams.get("status") || "";
  const formaPagamento = url.searchParams.get("formaPagamento") || "";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate   = url.searchParams.get("endDate") || "";
  const produto   = url.searchParams.get("produto")?.trim() || "";
  const page  = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const skip  = (page - 1) * limit;

  const where: any = { tenantId: session.user.tenantId };

  if (status) where.status = status;
  if (formaPagamento) where.formaPagamento = formaPagamento;
  if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
  if (endDate)   where.createdAt = { ...where.createdAt, lte: new Date(endDate + "T23:59:59.999Z") };

  // Busca geral: numero da venda ou nome do cliente
  if (q) {
    const num = Number(q);
    where.OR = [
      { cliente: { nome: { contains: q, mode: "insensitive" } } },
      ...(isNaN(num) ? [] : [{ numero: num }]),
    ];
  }

  // Busca por produto: nome do produto OU codigo de barras OU codigo interno
  if (produto) {
    where.itens = {
      some: {
        variante: {
          OR: [
            { codigoBarras:  { contains: produto, mode: "insensitive" } },
            { codigoInterno: { contains: produto, mode: "insensitive" } },
            { produto: { nome: { contains: produto, mode: "insensitive" } } },
          ],
        },
      },
    };
  }

  try {
    const [vendas, total] = await Promise.all([
      prisma.venda.findMany({
        where,
        include: {
          cliente: { select: { id: true, nome: true } },
          vendedor: { select: { id: true, name: true } },
          itens: {
            include: {
              variante: {
                include: { produto: { select: { nome: true } } },
              },
            },
          },
          pagamentos: true,
          contasReceber: {
            select: { id: true, valor: true, dataVencimento: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.venda.count({ where }),
    ]);

    const data = vendas.map((v) => ({
      id: v.id,
      numero: v.numero,
      status: v.status,
      formaPagamento: v.formaPagamento,
      subtotal: Number(v.subtotal),
      desconto: Number(v.desconto),
      total: Number(v.total),
      createdAt: v.createdAt,
      cliente: v.cliente,
      vendedor: v.vendedor,
      itens: v.itens.map((i) => ({
        id: i.id,
        nome: i.variante?.produto?.nome ?? "Produto",
        variante: [i.variante?.cor, i.variante?.tamanho].filter(Boolean).join(" / ") || "—",
        quantidade: i.quantidade,
        precoUnit: Number(i.precoUnit),
        subtotal: Number(i.subtotal),
      })),
      pagamentos: v.pagamentos.map((p) => ({
        formaPagamento: p.formaPagamento,
        valor: Number(p.valor),
      })),
    }));

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[GET /api/vendas/list]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}