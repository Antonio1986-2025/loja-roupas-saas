import { NextRequest, NextResponse } from "next/server";
import { importarProdutosDoCSV } from "@/lib/services/import.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const csvContent = formData.get("csv") as string | null;

    let content: string;

    if (file) {
      const bytes = await file.arrayBuffer();
      const text = new TextDecoder("utf-8").decode(bytes);
      content = text;
    } else if (csvContent) {
      content = csvContent;
    } else {
      return NextResponse.json(
        { error: "Envie um arquivo CSV ou conteudo CSV" },
        { status: 400 }
      );
    }

    const result = await importarProdutosDoCSV(session.user.tenantId, content);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Erro na importacao:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
