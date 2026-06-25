import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  listarEntradas,
  criarEntrada,
  EntradaMercadoriaError,
} from "@/lib/services/entrada-mercadoria.service";
import { createEntradaMercadoriaSchema } from "@/lib/validations/entrada-mercadoria";
import { parseNFeXml } from "@/lib/xml-nfe";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const entradas = await listarEntradas(session.user.tenantId);
    return NextResponse.json(entradas);
  } catch (error) {
    console.error("[GET /api/entradas]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

async function autoCadastrarFornecedor(
  tenantId: string,
  cnpj: string,
  nome: string
): Promise<{ id: string; criado: boolean } | null> {
  const cnpjLimpo = cnpj?.replace(/\D/g, "");
  if (!cnpjLimpo) return null;

  const existente = await prisma.fornecedor.findFirst({
    where: { tenantId, cnpj: { contains: cnpjLimpo } },
    select: { id: true },
  });
  if (existente) return { id: existente.id, criado: false };

  const novo = await prisma.fornecedor.create({
    data: { tenantId, nome, cnpj: cnpjLimpo },
  });
  return { id: novo.id, criado: true };
}

async function autoCriarProdutos(
  tenantId: string,
  itens: { nItem: number; nome: string; codigoProduto: string; precoUnitario: number }[]
) {
  const resultados: { nItem: number; varianteId: string; criado: boolean }[] = [];

  for (const item of itens) {
    const codBarras = item.codigoProduto?.trim() || `AUTO-${Date.now()}-${item.nItem}`;
    let variante = await prisma.produtoVariante.findFirst({
      where: { codigoBarras: codBarras },
      include: { produto: { select: { tenantId: true } } },
    });

    if (variante && variante.produto.tenantId !== tenantId) variante = null;

    if (variante) {
      resultados.push({ nItem: item.nItem, varianteId: variante.id, criado: false });
      continue;
    }

    const nomeCurto = item.nome.length > 60 ? item.nome.substring(0, 60) : item.nome;

    const novoProduto = await prisma.produto.create({
      data: {
        tenantId,
        nome: nomeCurto,
        ativo: true,
        precoVenda: item.precoUnitario || 0,
        variantes: {
          create: {
            codigoBarras: codBarras,
            qtdEstoque: 0,
            qtdDisponivel: 0,
            estoqueMinimo: 0,
            precoVenda: item.precoUnitario || null,
          },
        },
      },
    });

    const varianteCriada = await prisma.produtoVariante.findFirst({
      where: { produtoId: novoProduto.id },
    });

    resultados.push({
      nItem: item.nItem,
      varianteId: varianteCriada!.id,
      criado: true,
    });
  }

  return resultados;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body.action === "parse-xml") {
      const parsed = parseNFeXml(body.xmlContent);

      const fornecedor = await autoCadastrarFornecedor(
        session.user.tenantId,
        parsed.fornecedorCNPJ,
        parsed.fornecedorNome
      );

      return NextResponse.json({
        ...parsed,
        fornecedorId: fornecedor?.id || null,
        fornecedorCriado: fornecedor?.criado || false,
      });
    }

    if (body.action === "auto-criar-produtos") {
      const itens = body.itens as { nItem: number; nome: string; codigoProduto: string; precoUnitario: number }[];
      const resultados = await autoCriarProdutos(session.user.tenantId, itens);
      return NextResponse.json({ itens: resultados });
    }

    const parsed = createEntradaMercadoriaSchema.parse(body);
    const entrada = await criarEntrada(session.user.tenantId, parsed);

    return NextResponse.json(entrada, { status: 201 });
  } catch (error) {
    if (error instanceof EntradaMercadoriaError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      );
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: "VALIDACAO", issues: (error as any).issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/entradas]", error);
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
