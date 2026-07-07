import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calcularStatusAcesso, PRECO_MENSAL } from "@/lib/calculations/plano";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { status: true, trialEndsAt: true, assinaturaAte: true },
  });

  if (!tenant) return NextResponse.json({ error: "LOJA_NAO_ENCONTRADA" }, { status: 404 });

  const info = calcularStatusAcesso(tenant);

  return NextResponse.json({
    ...info,
    precoMensal: PRECO_MENSAL,
    whatsappSuporte: process.env.WHATSAPP_SUPORTE ?? "5511999999999",
  });
}