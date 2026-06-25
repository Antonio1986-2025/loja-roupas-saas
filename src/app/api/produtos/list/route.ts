import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Genero } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const categoriaId = url.searchParams.get("categoriaId") || "";
  const genero = url.searchParams.get("genero") || "";
  const estoqueBaixo = url.searchParams.get("estoqueBaixo") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { tenantId: session.user.tenantId };

  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { codigoInterno: { contains: q, mode: "insensitive" } },
      { codigoFornecedor: { contains: q, mode: "insensitive" } },
      { variantes: { some: { codigoBarras: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (categoriaId) where.categoriaId = categoriaId;
  if (genero) where.genero = genero as Genero;

  try {
    const [produtos, total] = await Promise.all([
      prisma.produto.findMany({
        where,
        include: {
          categoria: { select: { nome: true } },
          variantes: {
            select: {
              id: true,
              cor: true,
              tamanho: true,
              qtdEstoque: true,
              estoqueMinimo: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.produto.count({ where }),
    ]);

    const data = produtos.map((p) => {
      const totalEstoque = p.variantes.reduce((s, v) => s + v.qtdEstoque, 0);
      const variantesEstoqueBaixo = p.variantes.filter((v) => v.estoqueMinimo > 0 && v.qtdEstoque <= v.estoqueMinimo);

      return {
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        codigoInterno: p.codigoInterno,
        codigoFornecedor: p.codigoFornecedor,
        marca: p.marca,
        genero: p.genero,
        precoVenda: Number(p.precoVenda),
        precoCusto: p.precoCusto ? Number(p.precoCusto) : null,
        fotoUrl: p.fotoUrl,
        ativo: p.ativo,
        categoria: p.categoria ? { nome: p.categoria.nome } : null,
        qtdVariantes: p.variantes.length,
        totalEstoque,
        estoqueBaixo: variantesEstoqueBaixo.length > 0,
        estoqueZerado: totalEstoque === 0,
      };
    });

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[GET /api/produtos/list]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
