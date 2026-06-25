import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarProduto,
  atualizarProduto,
  excluirProduto,
  ProdutoError,
} from "@/lib/services/produto.service";
import { updateProdutoSchema } from "@/lib/validations/produto";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const produto = await buscarProduto(session.user.tenantId, params.id);
    return NextResponse.json(produto);
  } catch (error) {
    if (error instanceof ProdutoError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 404 }
      );
    }
    console.error("[GET /api/produtos/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateProdutoSchema.parse(body);
    const produto = await atualizarProduto(session.user.tenantId, params.id, parsed);
    return NextResponse.json(produto);
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
    console.error("[PUT /api/produtos/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    await excluirProduto(session.user.tenantId, params.id);
    return NextResponse.json({ message: "Produto excluído" });
  } catch (error) {
    if (error instanceof ProdutoError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[DELETE /api/produtos/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
