import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sangria, CaixaError } from "@/lib/services/caixa.service";
import { sangriaSchema } from "@/lib/validations/caixa";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = sangriaSchema.parse(body);
    const movimento = await sangria(session.user.tenantId, params.id, parsed, session.user.id);
    return NextResponse.json(movimento, { status: 201 });
  } catch (error) {
    if (error instanceof CaixaError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "VALIDACAO", issues: (error as any).issues }, { status: 400 });
    }
    console.error("[POST /api/caixa/[id]/sangria]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
