import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarEstoque } from "@/lib/services/estoque.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const categoriaId = url.searchParams.get("categoriaId") || "";
  const genero = url.searchParams.get("genero") || "";
  const situacaoRaw = url.searchParams.get("situacao") as "baixo" | "zerado" | "normal" | "excesso" | null;
  const situacao = situacaoRaw || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const limitFinal = situacao === "baixo" ? 200 : limit;

  try {
    const result = await listarEstoque(session.user.tenantId, {
      page,
      limit: limitFinal,
      q,
      categoriaId,
      genero,
      situacao,
    });

    if (situacao === "baixo") {
      const filtrados = result.data.filter((v) => v.situacao === "baixo");
      return NextResponse.json({
        data: filtrados,
        total: filtrados.length,
        page: 1,
        totalPages: 1,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/estoque/list]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
