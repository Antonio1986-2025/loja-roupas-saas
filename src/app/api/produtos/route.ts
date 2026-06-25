import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listarProdutos,
  criarProduto,
  ProdutoError,
} from "@/lib/services/produto.service";
import { createProdutoSchema } from "@/lib/validations/produto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const produtos = await listarProdutos(session.user.tenantId);
    return NextResponse.json(produtos);
  } catch (error) {
    console.error("[GET /api/produtos]", error);
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
    const parsed = createProdutoSchema.parse(body);
    const produto = await criarProduto(session.user.tenantId, parsed);
    return NextResponse.json(produto, { status: 201 });
  } catch (error) {
    if (error instanceof ProdutoError) {
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
    console.error("[POST /api/produtos]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
