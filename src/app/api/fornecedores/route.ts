import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listarFornecedores,
  criarFornecedor,
  FornecedorError,
} from "@/lib/services/fornecedor.service";
import { createFornecedorSchema } from "@/lib/validations/fornecedor";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const fornecedores = await listarFornecedores(session.user.tenantId);
    return NextResponse.json(fornecedores);
  } catch (error) {
    console.error("[GET /api/fornecedores]", error);
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
    const parsed = createFornecedorSchema.parse(body);
    const fornecedor = await criarFornecedor(session.user.tenantId, parsed);
    return NextResponse.json(fornecedor, { status: 201 });
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
    console.error("[POST /api/fornecedores]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
