import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

// POST /api/configuracoes/logo — upload da logo da loja
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "NENHUM_ARQUIVO" }, { status: 400 });

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "TIPO_INVALIDO", message: "Apenas imagens são aceitas" }, { status: 400 });
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "ARQUIVO_GRANDE", message: "Máximo 2MB" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "logos");
    await mkdir(dir, { recursive: true });

    const nomeArquivo = `logo-${session.user.tenantId}-${randomUUID()}.webp`;
    const caminho = path.join(dir, nomeArquivo);

    // Comprimir e converter para WebP (máx 400x400)
    const bytes = await file.arrayBuffer();
    const webpBuffer = await sharp(Buffer.from(bytes))
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();

    await writeFile(caminho, webpBuffer);

    const url = `/logos/${nomeArquivo}`;

    // Salvar URL no tenant
    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { logo: url },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[POST /api/configuracoes/logo]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

// DELETE /api/configuracoes/logo — remove a logo
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { logo: null },
  });

  return NextResponse.json({ ok: true });
}