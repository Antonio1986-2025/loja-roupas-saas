import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResumo, getMovimentacoesRecentes, getSaldoAtual, type Periodo } from "@/lib/services/fluxo-caixa.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periodo = (searchParams.get("periodo") || "30d") as Periodo;
  const tipo = searchParams.get("tipo") || "resumo";

  const validPeriodos = ["7d", "30d", "90d", "ano"];
  if (!validPeriodos.includes(periodo)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;

  try {
    switch (tipo) {
      case "resumo": {
        const [resumo, saldoAtual] = await Promise.all([
          getResumo(tenantId, periodo),
          getSaldoAtual(tenantId),
        ]);
        return NextResponse.json({ ...resumo, saldoAtual });
      }

      case "movimentacoes": {
        const dados = await getMovimentacoesRecentes(tenantId);
        return NextResponse.json(dados);
      }

      default:
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
  } catch (error) {
    console.error("[GET /api/fluxo-caixa]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
