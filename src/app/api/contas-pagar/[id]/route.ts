import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buscarContaPagar, atualizarContaPagar, pagarConta, excluirContaPagar, ContaPagarError } from "@/lib/services/conta-pagar.service";
import { updateContaPagarSchema } from "@/lib/validations/conta-pagar";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    const conta = await buscarContaPagar(session.user.tenantId, params.id);
    return NextResponse.json(conta);
  } catch (error) {
    if (error instanceof ContaPagarError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateContaPagarSchema.parse(body);
    const conta = await atualizarContaPagar(session.user.tenantId, params.id, parsed);
    return NextResponse.json(conta);
  } catch (error) {
    if (error instanceof ContaPagarError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "VALIDACAO", issues: (error as any).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    await pagarConta(session.user.tenantId, params.id);
    return NextResponse.json({ message: "Conta marcada como paga" });
  } catch (error) {
    if (error instanceof ContaPagarError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    await excluirContaPagar(session.user.tenantId, params.id);
    return NextResponse.json({ message: "Conta excluída" });
  } catch (error) {
    if (error instanceof ContaPagarError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
