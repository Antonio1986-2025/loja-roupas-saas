import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarMovimentacoes, type Periodo } from "@/lib/services/fluxo-caixa.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  const url = new URL(req.url);
  const periodo = (url.searchParams.get("periodo") || "30d") as Periodo;
  const tipo = url.searchParams.get("tipo") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));

  const validPeriodos = ["7d", "30d", "90d", "ano"];
  if (!validPeriodos.includes(periodo)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }

  try {
    const result = await listarMovimentacoes(session.user.tenantId, { page, limit, tipo, periodo });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/fluxo-caixa/movimentacoes]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
