import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendaById } from "@/lib/services/venda.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const venda = await getVendaById(session.user.tenantId, params.id);

    if (!venda) {
      return NextResponse.json({ error: "NAO_ENCONTRADA" }, { status: 404 });
    }

    return NextResponse.json(venda);
  } catch (error) {
    console.error("[GET /api/vendas/[id]]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
