import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { contarVencidas } from "@/lib/services/venda-condicional.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const vencidas = await contarVencidas(session.user.tenantId);
    return NextResponse.json({ vencidas });
  } catch (error) {
    console.error("[GET /api/condicionais/alertas]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
