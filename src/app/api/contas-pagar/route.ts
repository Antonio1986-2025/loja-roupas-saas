import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarContasPagar, criarContaPagar, ContaPagarError } from "@/lib/services/conta-pagar.service";
import { createContaPagarSchema } from "@/lib/validations/conta-pagar";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  try {
    const contas = await listarContasPagar(session.user.tenantId);
    return NextResponse.json(contas);
  } catch (error) {
    console.error("[GET /api/contas-pagar]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createContaPagarSchema.parse(body);
    const conta = await criarContaPagar(session.user.tenantId, parsed);
    return NextResponse.json(conta, { status: 201 });
  } catch (error) {
    if (error instanceof ContaPagarError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "VALIDACAO", issues: (error as any).issues }, { status: 400 });
    }
    console.error("[POST /api/contas-pagar]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
