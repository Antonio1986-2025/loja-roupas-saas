import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fecharCaixa, CaixaError } from "@/lib/services/caixa.service";
import { fecharCaixaSchema } from "@/lib/validations/caixa";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = fecharCaixaSchema.parse(body);
    const resultado = await fecharCaixa(session.user.tenantId, params.id, parsed);
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof CaixaError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "VALIDACAO", issues: (error as any).issues }, { status: 400 });
    }
    console.error("[POST /api/caixa/[id]/fechar]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
