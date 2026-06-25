import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listarVendasCondicionais,
  criarVendaCondicional,
  VendaCondicionalError,
} from "@/lib/services/venda-condicional.service";
import { createVendaCondicionalSchema } from "@/lib/validations/venda-condicional";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as
    | "ATIVA"
    | "FINALIZADA"
    | "CANCELADA"
    | "VENCIDA"
    | null;
  const clienteId = searchParams.get("clienteId") || undefined;
  const numero = searchParams.get("numero");
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 20);

  try {
    const result = await listarVendasCondicionais(session.user.tenantId, {
      status: status || undefined,
      clienteId,
      numero: numero ? Number(numero) : undefined,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/condicionais]", error);
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
    const parsed = createVendaCondicionalSchema.parse(body);

    const condicional = await criarVendaCondicional(
      session.user.tenantId,
      session.user.id,
      parsed
    );

    return NextResponse.json(condicional, { status: 201 });
  } catch (error) {
    if (error instanceof VendaCondicionalError) {
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
    console.error("[POST /api/condicionais]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
