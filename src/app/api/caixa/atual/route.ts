import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCaixaAtual } from "@/lib/services/caixa.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    const caixa = await getCaixaAtual(session.user.tenantId);
    return NextResponse.json(caixa);
  } catch (error) {
    console.error("[GET /api/caixa/atual]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
