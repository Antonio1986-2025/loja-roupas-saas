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
  const resultados: { nItem: number; varianteId: string | null; criado: boolean; erro?: string }[] = [];

  for (const item of itens) {
    try {
      // Garante código de barras único — usa o original, ou gera AUTO-...
      const codigoOriginal = (item.codigoProduto ?? "").toString().trim();
      let codBarras = codigoOriginal || `AUTO-${Date.now()}-${item.nItem}`;

      // Verifica se já existe (mesmo tenant)
      let variante = await prisma.produtoVariante.findFirst({
        where: { codigoBarras: codBarras },
        include: { produto: { select: { tenantId: true } } },
      });

      // Se existe em outro tenant, gera código alternativo
      if (variante && variante.produto.tenantId !== tenantId) {
        codBarras = `${codigoOriginal}-${tenantId.slice(0, 6)}-${item.nItem}`;
        variante = await prisma.produtoVariante.findFirst({
          where: { codigoBarras: codBarras },
          include: { produto: { select: { tenantId: true } } },
        });
        // Se mesmo o alternativo já existe em outro tenant, usa AUTO
        if (variante && variante.produto.tenantId !== tenantId) {
          codBarras = `AUTO-${Date.now()}-${item.nItem}`;
          variante = null;
        }
      }

      if (variante) {
        resultados.push({ nItem: item.nItem, varianteId: variante.id, criado: false });
        continue;
      }

      // Garante que o nome não fique vazio (campo obrigatório no banco)
      let nome = (item.nome ?? "").toString().trim();
      if (!nome) nome = codigoOriginal ? `Produto ${codigoOriginal}` : `Produto IA #${item.nItem}`;
      const nomeCurto = nome.length > 100 ? nome.substring(0, 100) : nome;

      const preco = Number(item.precoUnitario) || 0;

      const novoProduto = await prisma.produto.create({
        data: {
          tenantId,
          nome: nomeCurto,
          ativo: true,
          precoVenda: preco,
          variantes: {
            create: {
              codigoBarras: codBarras,
              qtdEstoque: 0,
              qtdDisponivel: 0,
              estoqueMinimo: 0,
              precoVenda: preco > 0 ? preco : null,
            },
          },
        },
        include: { variantes: { select: { id: true } } },
      });

      const varianteCriada = novoProduto.variantes[0];
      if (!varianteCriada) throw new Error("Variante não foi criada junto com o produto");

      resultados.push({
        nItem: item.nItem,
        varianteId: varianteCriada.id,
        criado: true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error(`[auto-criar-produtos] Falha no item ${item.nItem} (${item.nome}):`, msg);
      resultados.push({
        nItem: item.nItem,
        varianteId: null,
        criado: false,
        erro: msg.slice(0, 200),
      });
    }
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
        { error: "VALIDACAO", message: (error as any).issues?.[0]?.message || "Dados inválidos", issues: (error as any).issues },
        { status: 400 }
      );
    }
    // Prisma unique constraint — chave de acesso duplicada
    const errMsg = error instanceof Error ? error.message : "";
    if (errMsg.includes("chaveAcesso") || errMsg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "NF_DUPLICADA", message: "Esta Nota Fiscal já foi importada anteriormente." },
        { status: 409 }
      );
    }
    console.error("[POST /api/entradas]", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: "ERRO_INTERNO", message: msg }, { status: 500 });
  }
}
