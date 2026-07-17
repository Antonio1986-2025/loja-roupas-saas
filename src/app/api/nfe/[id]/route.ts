import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const nota = await prisma.notaFiscal.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: {
        itens: {
          include: {
            variante: {
              select: { cor: true, tamanho: true, produto: { select: { nome: true } } },
            },
          },
        },
        venda: { select: { numero: true, formaPagamento: true } },
      },
    });

    if (!nota) {
      return NextResponse.json({ error: "NAO_ENCONTRADA", message: "NF-e não encontrada" }, { status: 404 });
    }

    return NextResponse.json(nota);
  } catch (error) {
    console.error("[GET /api/nfe/[id]]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
