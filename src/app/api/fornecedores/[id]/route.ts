import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarFornecedor,
  atualizarFornecedor,
  excluirFornecedor,
  FornecedorError,
} from "@/lib/services/fornecedor.service";
import { updateFornecedorSchema } from "@/lib/validations/fornecedor";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const fornecedor = await buscarFornecedor(session.user.tenantId, params.id);
    return NextResponse.json(fornecedor);
  } catch (error) {
    if (error instanceof FornecedorError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 404 }
      );
    }
    console.error("[GET /api/fornecedores/:id]", error);
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
    const parsed = updateFornecedorSchema.parse(body);
    const fornecedor = await atualizarFornecedor(session.user.tenantId, params.id, parsed);
    return NextResponse.json(fornecedor);
  } catch (error) {
    if (error instanceof FornecedorError) {
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
    console.error("[PUT /api/fornecedores/:id]", error);
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
    await excluirFornecedor(session.user.tenantId, params.id);
    return NextResponse.json({ message: "Fornecedor excluído" });
  } catch (error) {
    if (error instanceof FornecedorError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[DELETE /api/fornecedores/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
