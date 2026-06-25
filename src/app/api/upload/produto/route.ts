import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "NENHUM_ARQUIVO" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "fotos");
    await mkdir(dir, { recursive: true });

    const nomeArquivo = `${randomUUID()}.webp`;
    const caminho = path.join(dir, nomeArquivo);

    const bytes = await file.arrayBuffer();
    const webpBuffer = await sharp(Buffer.from(bytes))
      .resize(800, undefined, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await writeFile(caminho, webpBuffer);

    const url = `/fotos/${nomeArquivo}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[POST /api/upload/produto]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
