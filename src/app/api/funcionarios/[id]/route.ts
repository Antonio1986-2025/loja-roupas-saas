import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarFuncionario,
  atualizarFuncionario,
  excluirFuncionario,
  FuncionarioError,
} from "@/lib/services/funcionario.service";
import { updateFuncionarioSchema } from "@/lib/validations/funcionario";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const funcionario = await buscarFuncionario(session.user.tenantId, params.id);
    return NextResponse.json(funcionario);
  } catch (error) {
    if (error instanceof FuncionarioError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 404 }
      );
    }
    console.error("[GET /api/funcionarios/:id]", error);
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
    const parsed = updateFuncionarioSchema.parse(body);
    const funcionario = await atualizarFuncionario(session.user.tenantId, params.id, parsed);
    return NextResponse.json(funcionario);
  } catch (error) {
    if (error instanceof FuncionarioError) {
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
    console.error("[PUT /api/funcionarios/:id]", error);
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
    await excluirFuncionario(session.user.tenantId, params.id);
    return NextResponse.json({ message: "Funcionário excluído" });
  } catch (error) {
    if (error instanceof FuncionarioError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[DELETE /api/funcionarios/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
