import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  finalizarVendaCondicional,
  VendaCondicionalError,
} from "@/lib/services/venda-condicional.service";
import { finalizarVendaCondicionalSchema } from "@/lib/validations/venda-condicional";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = finalizarVendaCondicionalSchema.parse(body);

    const result = await finalizarVendaCondicional(
      session.user.tenantId,
      session.user.id,
      params.id,
      parsed
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof VendaCondicionalError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: "VALIDACAO", issues: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/condicionais/:id/finalizar]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
