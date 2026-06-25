import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listarCategorias,
  criarCategoria,
  CategoriaError,
} from "@/lib/services/categoria.service";
import { createCategoriaSchema } from "@/lib/validations/categoria";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const categorias = await listarCategorias(session.user.tenantId);
    return NextResponse.json(categorias);
  } catch (error) {
    console.error("[GET /api/categorias]", error);
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
    const parsed = createCategoriaSchema.parse(body);
    const categoria = await criarCategoria(session.user.tenantId, parsed);
    return NextResponse.json(categoria, { status: 201 });
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
    console.error("[POST /api/categorias]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
