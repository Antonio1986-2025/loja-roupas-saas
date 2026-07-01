import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type EtiquetaItem = {
  id: string;
  codigoBarras: string | null;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  preco: number;
  codigoInterno: string | null;
  categoriaId: string | null;
  categoriaNome: string | null;
  quantidadeEntrada?: number;
};

// GET /api/etiquetas?categoriaId=X&varianteIds=a,b,c&entradaId=X
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  const url = new URL(req.url);
  const categoriaId = url.searchParams.get("categoriaId") || "";
  const varianteIds = url.searchParams.get("varianteIds") || "";
  const entradaId = url.searchParams.get("entradaId") || "";
  const produtoId = url.searchParams.get("produtoId") || "";
  const q = url.searchParams.get("q") || "";
  const tenantId = session.user.tenantId;

  let variantes;
  let quantidadePorVariante: Record<string, number> = {};

  if (entradaId) {
    // Buscar variantes de uma entrada de mercadoria específica
    const entrada = await prisma.entradaMercadoria.findFirst({
      where: { id: entradaId, tenantId },
      include: {
        itens: {
          include: {
            variante: {
              include: { produto: { include: { categoria: { select: { nome: true } } } } },
            },
          },
        },
      },
    });
    if (!entrada) return NextResponse.json({ error: "NAO_ENCONTRADA" }, { status: 404 });
    variantes = entrada.itens.map((i) => i.variante);
    quantidadePorVariante = Object.fromEntries(
      entrada.itens.map((i) => [i.variante.id, i.quantidade])
    );
  } else if (varianteIds) {
    // Buscar variantes específicas por ID
    const ids = varianteIds.split(",").filter(Boolean);
    variantes = await prisma.produtoVariante.findMany({
      where: { id: { in: ids }, produto: { tenantId } },
      include: { produto: { include: { categoria: { select: { nome: true } } } } },
    });
  } else if (produtoId) {
    // Todas as variantes de um produto específico
    variantes = await prisma.produtoVariante.findMany({
      where: { produtoId, produto: { tenantId } },
      include: { produto: { include: { categoria: { select: { nome: true } } } } },
      orderBy: [{ cor: "asc" }, { tamanho: "asc" }],
    });
  } else if (categoriaId) {
    // Buscar todas as variantes de uma categoria
    variantes = await prisma.produtoVariante.findMany({
      where: { produto: { tenantId, categoriaId } },
      include: { produto: { include: { categoria: { select: { nome: true } } } } },
      orderBy: [{ produto: { nome: "asc" } }, { cor: "asc" }, { tamanho: "asc" }],
    });
  } else {
    // Busca por texto (nome ou código interno)
    if (q) {
      variantes = await prisma.produtoVariante.findMany({
        where: {
          produto: {
            tenantId, ativo: true,
            OR: [
              { nome: { contains: q, mode: "insensitive" } },
              { codigoInterno: { contains: q, mode: "insensitive" } },
            ],
          },
        },
        include: { produto: { include: { categoria: { select: { nome: true } } } } },
        orderBy: [{ produto: { nome: "asc" } }, { cor: "asc" }, { tamanho: "asc" }],
        take: 30,
      });
    } else {
      // Todas as variantes ativas da loja
      variantes = await prisma.produtoVariante.findMany({
        where: { produto: { tenantId, ativo: true } },
        include: { produto: { include: { categoria: { select: { nome: true } } } } },
        orderBy: [{ produto: { nome: "asc" } }],
        take: 500,
      });
    }
  }

  const data: EtiquetaItem[] = variantes.map((v: any) => ({
    id: v.id,
    codigoBarras: v.codigoBarras || v.codigoInterno || v.id,
    nome: v.produto?.nome || "Produto",
    cor: v.cor,
    tamanho: v.tamanho,
    preco: Number(v.precoVenda ?? v.produto?.precoVenda ?? 0),
    codigoInterno: v.codigoInterno || v.produto?.codigoInterno,
    categoriaId: v.produto?.categoriaId,
    categoriaNome: v.produto?.categoria?.nome || null,
    quantidadeEntrada: quantidadePorVariante[v.id] || undefined,
  }));

  return NextResponse.json({ data, total: data.length });
}