import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emitirNFe } from "@/lib/services/nfe-emissao.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendaId } = body;

    if (!vendaId) {
      return NextResponse.json({ error: "Informe vendaId" }, { status: 400 });
    }

    const venda = await prisma.venda.findUnique({ where: { id: vendaId } });
    if (!venda) {
      return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });
    }

    const resultado = await emitirNFe(venda.tenantId, vendaId, "NFE");

    return NextResponse.json({
      success: true,
      vendaId: venda.id,
      nfeId: resultado.id,
      chaveAcesso: resultado.chaveAcesso,
      protocolo: resultado.protocolo,
      status: resultado.status,
      cStat: resultado.cStat,
      xMotivo: resultado.xMotivo,
      numero: resultado.numero,
      serie: resultado.serie,
    });
  } catch (error: any) {
    console.error("[TEST PRODUCAO]", error);
    return NextResponse.json({
      error: error.code || "ERRO",
      message: error.message,
      sCodigo: error.sCodigo,
    }, { status: 500 });
  }
}
