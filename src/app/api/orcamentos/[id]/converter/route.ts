import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  converterEmVenda,
  OrcamentoError,
} from "@/lib/services/orcamento.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    let caixaId: string | undefined;
    try {
      const body = await req.json();
      caixaId = body?.caixaId;
    } catch {
      // Body is optional
    }

    const vendaId = await converterEmVenda(
      session.user.tenantId,
      params.id,
      session.user.id,
      caixaId
    );

    return NextResponse.json({ vendaId }, { status: 201 });
  } catch (error) {
    if (error instanceof OrcamentoError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[POST /api/orcamentos/[id]/converter]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
