import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  criarVenda,
  listarVendas,
  VendaError,
} from "@/lib/services/venda.service";
import { createVendaSchema } from "@/lib/validations/venda";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const vendas = await listarVendas(session.user.tenantId);
    return NextResponse.json(vendas);
  } catch (error) {
    console.error("[GET /api/vendas]", error);
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
    const parsed = createVendaSchema.parse(body);

    const venda = await criarVenda(session.user.tenantId, session.user.id, parsed);

    return NextResponse.json(venda, { status: 201 });
  } catch (error) {
    if (error instanceof VendaError) {
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
    console.error("[POST /api/vendas]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
