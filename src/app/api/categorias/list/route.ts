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

  const where: any = { tenantId: session.user.tenantId };

  if (q) {
    where.nome = { contains: q, mode: "insensitive" };
  }

  try {
    const [categorias, total] = await Promise.all([
      prisma.categoria.findMany({
        where,
        include: { _count: { select: { produtos: true } } },
        orderBy: { nome: "asc" },
        skip,
        take: limit,
      }),
      prisma.categoria.count({ where }),
    ]);

    return NextResponse.json({
      data: categorias.map((c) => ({
        id: c.id,
        nome: c.nome,
        slug: c.slug,
        totalProdutos: c._count.produtos,
        createdAt: c.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[GET /api/categorias/list]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}