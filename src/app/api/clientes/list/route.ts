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
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;
  const orderBy = url.searchParams.get("orderBy") === "data" ? "createdAt" : "nome";

  const where: any = { tenantId: session.user.tenantId };

  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { cpf: { contains: q } },
      { telefone: { contains: q } },
    ];
  }

  try {
    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: { _count: { select: { vendas: true } } },
        orderBy: orderBy === "createdAt" ? { createdAt: "desc" } : { nome: "asc" },
        skip,
        take: limit,
      }),
      prisma.cliente.count({ where }),
    ]);

    const data = clientes.map((c) => ({
      id: c.id,
      nome: c.nome,
      cpf: c.cpf,
      telefone: c.telefone,
      email: c.email,
      creditoAtual: Number(c.creditoAtual),
      totalVendas: c._count.vendas,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[GET /api/clientes/list]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
