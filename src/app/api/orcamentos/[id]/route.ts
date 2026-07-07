import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarOrcamento,
  atualizarOrcamento,
  cancelarOrcamento,
  OrcamentoError,
} from "@/lib/services/orcamento.service";
import { updateOrcamentoSchema } from "@/lib/validations/orcamento";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const orcamento = await buscarOrcamento(session.user.tenantId, params.id);
    if (!orcamento) {
      return NextResponse.json({ error: "NAO_ENCONTRADO" }, { status: 404 });
    }
    return NextResponse.json(orcamento);
  } catch (error) {
    console.error("[GET /api/orcamentos/[id]]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateOrcamentoSchema.parse(body);

    const orcamento = await atualizarOrcamento(
      session.user.tenantId,
      params.id,
      parsed
    );

    return NextResponse.json(orcamento);
  } catch (error) {
    if (error instanceof OrcamentoError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: "VALIDACAO", issues: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/orcamentos/[id]]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    await cancelarOrcamento(session.user.tenantId, params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof OrcamentoError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[DELETE /api/orcamentos/[id]]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
