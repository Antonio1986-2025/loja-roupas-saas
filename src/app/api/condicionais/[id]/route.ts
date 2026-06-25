import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarVendaCondicional,
  cancelarVendaCondicional,
  VendaCondicionalError,
} from "@/lib/services/venda-condicional.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const condicional = await buscarVendaCondicional(session.user.tenantId, params.id);
    return NextResponse.json(condicional);
  } catch (error) {
    if (error instanceof VendaCondicionalError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 404 });
    }
    console.error("[GET /api/condicionais/:id]", error);
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
    await cancelarVendaCondicional(session.user.tenantId, params.id);
    return NextResponse.json({ message: "Condicional cancelada" });
  } catch (error) {
    if (error instanceof VendaCondicionalError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    console.error("[DELETE /api/condicionais/:id]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
