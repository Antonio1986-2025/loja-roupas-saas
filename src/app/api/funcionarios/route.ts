import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listarFuncionarios,
  criarFuncionario,
  FuncionarioError,
} from "@/lib/services/funcionario.service";
import { createFuncionarioSchema } from "@/lib/validations/funcionario";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    // Optional filter: only funcionarios without a linked user
    const semUsuario = req.nextUrl.searchParams.get("sem-usuario") === "true";

    if (semUsuario) {
      const funcionarios = await prisma.funcionario.findMany({
        where: { tenantId: session.user.tenantId, userId: null },
        select: { id: true, nome: true, cargo: true },
        orderBy: { nome: "asc" },
      });
      return NextResponse.json(funcionarios);
    }

    const funcionarios = await listarFuncionarios(session.user.tenantId);
    return NextResponse.json(funcionarios);
  } catch (error) {
    console.error("[GET /api/funcionarios]", error);
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
    const parsed = createFuncionarioSchema.parse(body);
    const funcionario = await criarFuncionario(session.user.tenantId, parsed);
    return NextResponse.json(funcionario, { status: 201 });
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
    console.error("[POST /api/funcionarios]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
