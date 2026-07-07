import { NextRequest, NextResponse } from "next/server";
import { registrarLoja, RegistroError } from "@/lib/services/registro.service";
import { registroSchema } from "@/lib/validations/registro";

// Rota PUBLICA - nao exige sessao (e o cadastro de novas lojas).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registroSchema.parse(body);
    const resultado = await registrarLoja(parsed);
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof RegistroError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    if (error && typeof error === "object" && "issues" in error) {
      const issues = (error as { issues: { message: string }[] }).issues;
      return NextResponse.json(
        { error: "VALIDACAO", message: issues[0]?.message ?? "Dados inválidos", issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "ERRO_INTERNO", message: "Erro ao criar conta" }, { status: 500 });
  }
}