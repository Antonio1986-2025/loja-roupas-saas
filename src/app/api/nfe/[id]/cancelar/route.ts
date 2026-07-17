import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cancelarNFe, NfeEmissaoError } from "@/lib/services/nfe-emissao.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { justificativa } = body;

    if (!justificativa || justificativa.length < 15) {
      return NextResponse.json(
        { error: "JUSTIFICATIVA_CURTA", message: "Justificativa deve ter pelo menos 15 caracteres" },
        { status: 400 }
      );
    }

    const resultado = await cancelarNFe(session.user.tenantId, params.id, justificativa);

    return NextResponse.json({ success: true, ...resultado });
  } catch (error) {
    if (error instanceof NfeEmissaoError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[POST /api/nfe/[id]/cancelar]", error);
    return NextResponse.json({ error: "ERRO_INTERNO", message: "Erro ao cancelar NF-e" }, { status: 500 });
  }
}
