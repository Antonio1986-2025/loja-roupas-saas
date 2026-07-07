import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "SEM_PERMISSAO" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      funcionario: { select: { id: true, nome: true, cargo: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "SEM_PERMISSAO" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, funcionarioId } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Campos obrigatórios: nome, email, senha, perfil" }, { status: 400 });
  }

  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) return NextResponse.json({ error: "Este email já está em uso" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: role as any,
      tenantId: session.user.tenantId,
    },
  });

  // Link to funcionario if provided
  if (funcionarioId) {
    await prisma.funcionario.update({
      where: { id: funcionarioId },
      data: { userId: user.id },
    });
  }

  return NextResponse.json(user, { status: 201 });
}
