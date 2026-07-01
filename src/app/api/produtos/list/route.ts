import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fotoUrl } from "@/lib/google-drive";
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
  const apenasComEstoque = url.searchParams.get("apenasComEstoque") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { tenantId: session.user.tenantId };

  if (q) {
    const words = q.split(/\s+/).filter(Boolean);
    where.AND = words.map((word) => ({
      OR: [
        { nome: { contains: word, mode: "insensitive" } },
        { descricao: { contains: word, mode: "insensitive" } },
        { codigoInterno: { contains: word, mode: "insensitive" } },
        { codigoFornecedor: { contains: word, mode: "insensitive" } },
        { variantes: { some: { codigoBarras: { contains: word, mode: "insensitive" } } } },
      ],
    }));
  }
  if (categoriaId) where.categoriaId = categoriaId;
  if (genero) where.genero = genero as Genero;
  if (apenasComEstoque) {
    where.variantes = { some: { qtdEstoque: { gt: 0 } } };
  }

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
        fotoUrl: fotoUrl(p.fotoUrl, "thumb"),
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
