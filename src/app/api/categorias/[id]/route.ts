import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarCategoria,
  atualizarCategoria,
  excluirCategoria,
  CategoriaError,
} from "@/lib/services/categoria.service";
import { updateCategoriaSchema } from "@/lib/validations/categoria";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const categoria = await buscarCategoria(session.user.tenantId, params.id);
    return NextResponse.json(categoria);
  } catch (error) {
    if (error instanceof CategoriaError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 404 }
      );
    }
    console.error("[GET /api/categorias/:id]", error);
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
    const parsed = updateCategoriaSchema.parse(body);
    const categoria = await atualizarCategoria(session.user.tenantId, params.id, parsed);
    return NextResponse.json(categoria);
  } catch (error) {
    if (error instanceof CategoriaError) {
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
    console.error("[PUT /api/categorias/:id]", error);
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
    await excluirCategoria(session.user.tenantId, params.id);
    return NextResponse.json({ message: "Categoria excluída" });
  } catch (error) {
    if (error instanceof CategoriaError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[DELETE /api/categorias/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
