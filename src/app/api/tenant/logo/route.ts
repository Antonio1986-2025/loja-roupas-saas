import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ logo: null });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { logo: true },
  });

  return NextResponse.json({ logo: tenant?.logo ?? null });
}