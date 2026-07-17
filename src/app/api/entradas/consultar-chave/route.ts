import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consultarNfe, NfeConsultaError } from "@/lib/nfe-consulta";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const { chaveAcesso } = await req.json();

    if (!chaveAcesso) {
      return NextResponse.json(
        { error: "CHAVE_INVALIDA", message: "Informe a chave de acesso da NF-e" },
        { status: 400 }
      );
    }

    const chaveLimpa = chaveAcesso.replace(/\D/g, "");
    if (chaveLimpa.length !== 44) {
      return NextResponse.json(
        { error: "CHAVE_INVALIDA", message: "Chave de acesso deve ter 44 dígitos" },
        { status: 400 }
      );
    }

    const resultado = await consultarNfe(chaveLimpa, session.user.tenantId);

    return NextResponse.json({
      success: true,
      chave: resultado.chNFe,
      protocolo: resultado.nProt,
      dataRecebimento: resultado.dhRecbto,
      xml: resultado.xml,
    });
  } catch (error) {
    if (error instanceof NfeConsultaError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[POST /api/entradas/consultar-chave]", error);
    return NextResponse.json({ error: "ERRO_INTERNO", message: "Erro interno ao consultar SEFAZ" }, { status: 500 });
  }
}
