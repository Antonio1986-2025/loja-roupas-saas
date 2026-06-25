import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarMovimentos, EstoqueError } from "@/lib/services/estoque.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { varianteId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));

  try {
    const result = await listarMovimentos(params.varianteId, page, limit);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EstoqueError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 404 });
    }
    console.error("[GET /api/estoque/[varianteId]/movimentos]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}