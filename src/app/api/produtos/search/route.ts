import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fotoUrl } from "@/lib/google-drive";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const categoriaId = url.searchParams.get("categoriaId") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const searchWhere: any = {
    produto: { tenantId: session.user.tenantId, ativo: true },
  };
  if (q) {
    searchWhere.OR = [
      { codigoBarras: { contains: q, mode: "insensitive" } },
      { codigoInterno: { contains: q, mode: "insensitive" } },
      { produto: { nome: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (categoriaId) {
    searchWhere.produto = { ...searchWhere.produto, categoriaId };
  }

  try {
    const [variantes, total] = await Promise.all([
      prisma.produtoVariante.findMany({
        where: searchWhere,
        select: {
          id: true,
          cor: true,
          tamanho: true,
          codigoBarras: true,
          precoVenda: true,
          qtdDisponivel: true,
          produto: {
            select: {
              nome: true,
              precoVenda: true,
              marca: true,
              codigoInterno: true,
              genero: true,
              fotoUrl: true,
              categoriaId: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { produto: { nome: "asc" } },
      }),
      prisma.produtoVariante.count({ where: searchWhere }),
    ]);

    const data = variantes.map((v) => ({
      id: v.id,
      nome: v.produto.nome,
      cor: v.cor,
      tamanho: v.tamanho,
      codigoBarras: v.codigoBarras,
      preco: Number(v.precoVenda ?? v.produto.precoVenda),
      qtdDisponivel: v.qtdDisponivel,
      marca: v.produto.marca,
      codigoInterno: v.produto.codigoInterno,
      genero: v.produto.genero,
      fotoUrl: fotoUrl(v.produto.fotoUrl, "thumb"),
    }));

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[GET /api/produtos/search]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
