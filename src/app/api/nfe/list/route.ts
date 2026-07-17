import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status") || undefined;
    const tipo = searchParams.get("tipo") || undefined;

    const where: any = { tenantId: session.user.tenantId };
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;

    const notas = await prisma.notaFiscal.findMany({
      where,
      include: {
        venda: { select: { numero: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    return NextResponse.json(notas);
  } catch (error) {
    console.error("[GET /api/nfe/list]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
