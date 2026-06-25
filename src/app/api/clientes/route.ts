import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listarClientes,
  criarCliente,
  ClienteError,
} from "@/lib/services/cliente.service";
import { createClienteSchema } from "@/lib/validations/cliente";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const clientes = await listarClientes(session.user.tenantId);
    return NextResponse.json(clientes);
  } catch (error) {
    console.error("[GET /api/clientes]", error);
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
    const parsed = createClienteSchema.parse(body);
    const cliente = await criarCliente(session.user.tenantId, parsed);
    return NextResponse.json(cliente, { status: 201 });
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
    console.error("[POST /api/clientes]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
