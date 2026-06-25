import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMovimentos, CaixaError } from "@/lib/services/caixa.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    const movimentos = await getMovimentos(params.id, session.user.tenantId);
    return NextResponse.json(movimentos);
  } catch (error) {
    if (error instanceof CaixaError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    console.error("[GET /api/caixa/[id]/movimentos]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
