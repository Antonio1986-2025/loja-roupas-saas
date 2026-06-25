import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  devolverItensVenda,
  VendaError,
} from "@/lib/services/venda.service";
import { devolucaoSchema } from "@/lib/validations/venda";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = devolucaoSchema.parse(body);

    const resultado = await devolverItensVenda(
      session.user.tenantId,
      params.id,
      parsed
    );

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof VendaError) {
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
    console.error("[POST /api/vendas/[id]/devolver]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
