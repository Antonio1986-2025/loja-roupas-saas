import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: any = { tenantId: session.user.tenantId };

  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { cnpj: { contains: q } },
      { cidade: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [fornecedores, total] = await Promise.all([
      prisma.fornecedor.findMany({
        where,
        orderBy: { nome: "asc" },
        skip,
        take: limit,
      }),
      prisma.fornecedor.count({ where }),
    ]);

    const data = fornecedores.map((f) => ({
      id: f.id,
      nome: f.nome,
      cnpj: f.cnpj,
      telefone: f.telefone,
      email: f.email,
      endereco: f.endereco,
      cidade: f.cidade,
      estado: f.estado,
      cep: f.cep,
      observacoes: f.observacoes,
      createdAt: f.createdAt,
    }));

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[GET /api/fornecedores/list]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
