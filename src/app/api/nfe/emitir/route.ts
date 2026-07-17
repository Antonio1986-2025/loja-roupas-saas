import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { emitirNFe, NfeEmissaoError } from "@/lib/services/nfe-emissao.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { vendaId, tipo } = body; // tipo: "NFE" | "NFCE"

    if (!vendaId) {
      return NextResponse.json({ error: "VENDA_OBRIGATORIA", message: "Informe o ID da venda" }, { status: 400 });
    }

    const resultado = await emitirNFe(session.user.tenantId, vendaId, tipo || "NFE");

    return NextResponse.json({
      success: true,
      id: resultado.id,
      chaveAcesso: resultado.chaveAcesso,
      protocolo: resultado.protocolo,
      status: resultado.status,
      cStat: resultado.cStat,
      xMotivo: resultado.xMotivo,
      numero: resultado.numero,
      serie: resultado.serie,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof NfeEmissaoError) {
      return NextResponse.json(
        { error: error.code, message: error.message, sCodigo: error.sCodigo },
        { status: 400 }
      );
    }
    console.error("[POST /api/nfe/emitir]", error);
    return NextResponse.json(
      { error: "ERRO_INTERNO", message: "Erro interno ao emitir NF-e" },
      { status: 500 }
    );
  }
}
