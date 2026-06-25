import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obterResumo } from "@/lib/services/estoque.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const resumo = await obterResumo(session.user.tenantId);
    return NextResponse.json(resumo);
  } catch (error) {
    console.error("[GET /api/estoque/resumo]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
