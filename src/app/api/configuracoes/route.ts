import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  obterConfiguracao,
  atualizarConfiguracao,
  ConfiguracaoError,
} from "@/lib/services/configuracao.service";
import { updateConfiguracaoSchema } from "@/lib/validations/configuracao";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const config = await obterConfiguracao(session.user.tenantId);
    return NextResponse.json(config);
  } catch (error) {
    console.error("[GET /api/configuracoes]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateConfiguracaoSchema.parse(body);
    const config = await atualizarConfiguracao(session.user.tenantId, parsed);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof ConfiguracaoError) {
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
    console.error("[PUT /api/configuracoes]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
