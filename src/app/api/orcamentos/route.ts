import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listarOrcamentos,
  criarOrcamento,
  OrcamentoError,
} from "@/lib/services/orcamento.service";
import { createOrcamentoSchema } from "@/lib/validations/orcamento";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    const result = await listarOrcamentos(session.user.tenantId, {
      status,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/orcamentos]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createOrcamentoSchema.parse(body);

    const orcamento = await criarOrcamento(
      session.user.tenantId,
      session.user.id,
      parsed
    );

    return NextResponse.json(orcamento, { status: 201 });
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
    console.error("[POST /api/orcamentos]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
