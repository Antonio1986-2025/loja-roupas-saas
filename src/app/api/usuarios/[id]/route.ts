import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "SEM_PERMISSAO" }, { status: 403 });

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!user) return NextResponse.json({ error: "NAO_ENCONTRADO" }, { status: 404 });

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.role) updateData.role = body.role;
  if (body.name) updateData.name = body.name;
  if (body.password) updateData.password = await bcrypt.hash(body.password, 10);

  const updated = await prisma.user.update({ where: { id: params.id }, data: updateData });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "SEM_PERMISSAO" }, { status: 403 });
  if (session.user.id === params.id)
    return NextResponse.json({ error: "Você não pode excluir seu próprio usuário" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!user) return NextResponse.json({ error: "NAO_ENCONTRADO" }, { status: 404 });

  // Unlink from funcionario first
  await prisma.funcionario.updateMany({ where: { userId: params.id }, data: { userId: null } });
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
