import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() || "";

  try {
    const clientes = await prisma.cliente.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(q
          ? {
              OR: [
                { nome: { contains: q, mode: "insensitive" } },
                { cpf: { contains: q } },
                { telefone: { contains: q } },
              ],
            }
          : {}),
      },
      select: { id: true, nome: true, telefone: true, cpf: true, creditoAtual: true },
      take: 15,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error("[GET /api/clientes/search]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
