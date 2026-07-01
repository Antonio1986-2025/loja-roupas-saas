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
  const apenasComEstoque = url.searchParams.get("apenasComEstoque") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const tenantId = session.user.tenantId;

  try {
    let countQuery = `
      SELECT COUNT(*)::int as total FROM "produto_variantes" v
      INNER JOIN "produtos" p ON p.id = v."produtoId"
      WHERE p."tenantId" = $1 AND p.ativo = true
    `;
    let dataQuery = `
      SELECT v.id, v.cor, v.tamanho, v."codigoBarras", v."precoVenda", v."qtdDisponivel",
             p.nome, p."precoVenda" as p_preco, p.marca, p."codigoInterno", p.genero, p."fotoUrl", p."categoriaId"
      FROM "produto_variantes" v
      INNER JOIN "produtos" p ON p.id = v."produtoId"
      WHERE p."tenantId" = $1 AND p.ativo = true
    `;
    const params: any[] = [tenantId];

    if (categoriaId) {
      const cond = ` AND p."categoriaId" = $${params.length + 1}`;
      countQuery += cond;
      dataQuery += cond;
      params.push(categoriaId);
    }

    if (apenasComEstoque) {
      const cond = ` AND v."qtdDisponivel" > 0`;
      countQuery += cond;
      dataQuery += cond;
    }

    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      for (const word of words) {
        const idx = params.length + 1;
        const cond = ` AND (
          v."codigoBarras" ILIKE $${idx}
          OR v."codigoInterno" ILIKE $${idx}
          OR p.nome ILIKE $${idx}
          OR p.descricao ILIKE $${idx}
        )`;
        countQuery += cond;
        dataQuery += cond;
        params.push(`%${word}%`);
      }
    }

    dataQuery += ` ORDER BY p.nome ASC OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    params.push(skip, limit);

    const [countResult, variantesRaw] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(countQuery, ...params.slice(0, params.length - 2)),
      prisma.$queryRawUnsafe<any[]>(dataQuery, ...params),
    ]);

    const total = countResult[0]?.total ?? 0;

    const data = variantesRaw.map((v: any) => ({
      id: v.id,
      nome: v.nome,
      cor: v.cor,
      tamanho: v.tamanho,
      codigoBarras: v.codigoBarras,
      preco: Number(v.precoVenda ?? v.p_preco),
      qtdDisponivel: v.qtdDisponivel,
      marca: v.marca,
      codigoInterno: v.codigoInterno,
      genero: v.genero,
      fotoUrl: fotoUrl(v.fotoUrl, "thumb"),
    }));

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[GET /api/produtos/search]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
