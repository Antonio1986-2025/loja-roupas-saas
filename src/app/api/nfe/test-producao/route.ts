import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emitirNFe } from "@/lib/services/nfe-emissao.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, vendaId } = body;

    if (!email && !vendaId) {
      return NextResponse.json({ error: "Informe email ou vendaId" }, { status: 400 });
    }

    let tid: string;
    let vendedorId: string;
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
      tid = user.tenantId;
      vendedorId = user.id;
    } else {
      const user = await prisma.user.findFirst();
      if (!user) return NextResponse.json({ error: "Nenhum usuario" }, { status: 500 });
      tid = user.tenantId;
      vendedorId = user.id;
    }

    let venda;
    if (vendaId) {
      venda = await prisma.venda.findUnique({ where: { id: vendaId } });
      if (!venda) return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });
    } else {
      let cliente = await prisma.cliente.findFirst({ where: { tenantId: tid } });
      if (!cliente) {
        cliente = await prisma.cliente.create({
          data: { tenantId: tid, nome: "Cliente Teste", cpf: "52998224725" },
        });
      }

      let produto = await prisma.produto.findFirst({ where: { tenantId: tid } });
      if (!produto) {
        produto = await prisma.produto.create({
          data: { tenantId: tid, nome: "Produto Teste", precoVenda: 1.0 },
        });
      }

      let variante = await prisma.produtoVariante.findFirst({
        where: { produtoId: produto.id },
      });
      if (!variante) {
        variante = await prisma.produtoVariante.create({
          data: {
            produtoId: produto.id,
            codigoBarras: `TEST${Date.now()}`,
            precoVenda: 1.0,
            qtdEstoque: 10,
            qtdDisponivel: 10,
          },
        });
      }

      const ultimoNumero = await prisma.venda.findFirst({
        where: { tenantId: tid },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });

      venda = await prisma.venda.create({
        data: {
          tenantId: tid,
          clienteId: cliente.id,
          vendedorId,
          numero: (ultimoNumero?.numero ?? 0) + 1,
          subtotal: 1.0,
          total: 1.0,
          formaPagamento: "DINHEIRO",
          status: "CONCLUIDA",
          itens: {
            create: {
              varianteId: variante.id,
              quantidade: 1,
              precoUnit: 1.0,
              subtotal: 1.0,
            },
          },
        },
      });
    }

    const resultado = await emitirNFe(tid, venda!.id, "NFE");

    return NextResponse.json({
      success: true,
      vendaId: venda!.id,
      nfeId: resultado.id,
      chaveAcesso: resultado.chaveAcesso,
      protocolo: resultado.protocolo,
      status: resultado.status,
      cStat: resultado.cStat,
      xMotivo: resultado.xMotivo,
      numero: resultado.numero,
      serie: resultado.serie,
    });
  } catch (error: any) {
    console.error("[TEST PRODUCAO]", error);
    return NextResponse.json({
      error: error.code || "ERRO",
      message: error.message,
      sCodigo: error.sCodigo,
    }, { status: 500 });
  }
}
