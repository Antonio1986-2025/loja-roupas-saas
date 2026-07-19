import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emitirNFe } from "@/lib/services/nfe-emissao.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, email, vendaId } = body;

    if (!tenantId && !email) {
      return NextResponse.json({ error: "Informe tenantId ou email" }, { status: 400 });
    }

    let tid = tenantId;
    if (!tid && email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
      tid = user.tenantId;
    }

    // Usar venda existente ou criar uma nova
    let venda;
    if (vendaId) {
      venda = await prisma.venda.findUnique({ where: { id: vendaId } });
      if (!venda) return NextResponse.json({ error: "Venda nao encontrada" }, { status: 404 });
    } else {
      // Criar venda de teste
      let cliente = await prisma.cliente.findFirst({ where: { tenantId: tid } });
      if (!cliente) {
        cliente = await prisma.cliente.create({
          data: { tenantId: tid!, nome: "Cliente Teste", cpfCnpj: "52998224725", tipoPessoa: "FISICA" },
        });
      }

      let produto = await prisma.produto.findFirst({ where: { tenantId: tid } });
      if (!produto) {
        produto = await prisma.produto.create({
          data: { tenantId: tid!, nome: "Produto Teste", preco: 1.0 },
        });
      }

      venda = await prisma.venda.create({
        data: {
          tenantId: tid!,
          clienteId: cliente.id,
          status: "CONCLUIDA",
          total: 1.0,
          formaPagamento: "DINHEIRO",
          itens: { create: { produtoNome: produto.nome, produtoId: produto.id, quantidade: 1, valorUnitario: 1.0, valorTotal: 1.0 } },
        },
      });
    }

    const resultado = await emitirNFe(tid!, venda!.id, "NFE");

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
      stack: error.stack,
    }, { status: 500 });
  }
}
