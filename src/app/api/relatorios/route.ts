import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getResumo,
  getVendasPorDia,
  getVendasPorPagamento,
  getProdutosMaisVendidos,
  getLucro,
  getCondicionaisResumo,
  type Periodo,
} from "@/lib/services/relatorio.service";

const periodosValidos = ["hoje", "7d", "30d", "90d", "ano"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodo = (searchParams.get("periodo") || "30d") as Periodo;
  const tipo = searchParams.get("tipo") || "resumo";

  if (!periodosValidos.includes(periodo)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;

  try {
    switch (tipo) {
      case "resumo": {
        const resumo = await getResumo(tenantId, periodo);
        return NextResponse.json(resumo);
      }

      case "vendas-por-dia": {
        const dados = await getVendasPorDia(tenantId, periodo);
        return NextResponse.json(dados);
      }

      case "vendas-por-pagamento": {
        const dados = await getVendasPorPagamento(tenantId, periodo);
        return NextResponse.json(dados);
      }

      case "produtos-mais-vendidos": {
        const dados = await getProdutosMaisVendidos(tenantId, periodo);
        return NextResponse.json(dados);
      }

      case "lucro": {
        const dados = await getLucro(tenantId, periodo);
        return NextResponse.json(dados);
      }

      case "condicionais": {
        const dados = await getCondicionaisResumo(tenantId);
        return NextResponse.json(dados);
      }

      default:
        return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
    }
  } catch (error) {
    console.error("[GET /api/relatorios]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
