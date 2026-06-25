import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarCliente,
  atualizarCliente,
  excluirCliente,
  ClienteError,
} from "@/lib/services/cliente.service";
import { updateClienteSchema } from "@/lib/validations/cliente";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const cliente = await buscarCliente(session.user.tenantId, params.id);
    return NextResponse.json(cliente);
  } catch (error) {
    if (error instanceof ClienteError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 404 }
      );
    }
    console.error("[GET /api/clientes/:id]", error);
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
    const parsed = updateClienteSchema.parse(body);
    const cliente = await atualizarCliente(session.user.tenantId, params.id, parsed);
    return NextResponse.json(cliente);
  } catch (error) {
    if (error instanceof ClienteError) {
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
    console.error("[PUT /api/clientes/:id]", error);
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
    await excluirCliente(session.user.tenantId, params.id);
    return NextResponse.json({ message: "Cliente excluído" });
  } catch (error) {
    if (error instanceof ClienteError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    console.error("[DELETE /api/clientes/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
