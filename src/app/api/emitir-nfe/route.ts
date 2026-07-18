import { NextRequest, NextResponse } from "next/server";
import { emitirNFe, NfeEmissaoError } from "@/lib/services/nfe-emissao.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, vendaId, tipo } = body;

    if (!tenantId || !vendaId) {
      return NextResponse.json({ error: "tenantId e vendaId obrigatorios" }, { status: 400 });
    }

    const resultado = await emitirNFe(tenantId, vendaId, tipo || "NFE");

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
    console.error("[POST /api/emitir-nfe]", error);
    return NextResponse.json(
      { error: "ERRO_INTERNO", message: "Erro interno ao emitir NF-e" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
