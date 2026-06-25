import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ajustarEstoque, EstoqueError } from "@/lib/services/estoque.service";
import { z } from "zod";

const ajusteSchema = z.object({
  quantidade: z.number().int().min(0, "Quantidade não pode ser negativa"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  observacao: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { varianteId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ajusteSchema.parse(body);
    const movimento = await ajustarEstoque(
      session.user.tenantId,
      params.varianteId,
      parsed,
      session.user.id
    );
    return NextResponse.json(movimento, { status: 201 });
  } catch (error) {
    if (error instanceof EstoqueError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "VALIDACAO", issues: (error as any).issues }, { status: 400 });
    }
    console.error("[POST /api/estoque/[varianteId]/ajustar]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}