import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { CreateVendaInput } from "@/lib/validations/venda";
import type { FormaPagamento as FPEnum } from "@prisma/client";

export class VendaError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "VendaError";
  }
}

type FormaPagamento = FPEnum;

export async function criarVenda(
  tenantId: string,
  vendedorId: string,
  data: CreateVendaInput
) {
  return prisma.$transaction(async (tx) => {
    if (data.caixaId) {
      const caixa = await tx.caixa.findFirst({
        where: { id: data.caixaId, tenantId, status: "ABERTO" },
      });
      if (!caixa) {
        throw new VendaError("CAIXA_NAO_ABERTO", "Caixa não está aberto. Abra o caixa antes de vender.");
      }
    }

    const itensData: {
      varianteId: string;
      quantidade: number;
      precoUnit: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }[] = [];

    for (const item of data.itens) {
      const variante = await tx.produtoVariante.findUnique({
        where: { id: item.varianteId },
        include: { produto: { select: { nome: true, precoVenda: true } } },
      });

      if (!variante) {
        throw new VendaError("VARIANTE_NAO_ENCONTRADA", "Produto não encontrado");
      }

      if (variante.qtdEstoque < item.quantidade) {
        throw new VendaError(
          "ESTOQUE_INSUFICIENTE",
          `Estoque insuficiente para ${variante.produto.nome}`
        );
      }

      itensData.push({
        varianteId: item.varianteId,
        quantidade: item.quantidade,
        precoUnit: new Prisma.Decimal(item.precoUnit),
        subtotal: new Prisma.Decimal(item.subtotal),
      });
    }

    const ultima = await tx.venda.findFirst({
      where: { tenantId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const numero = (ultima?.numero ?? 0) + 1;

    const subtotal = itensData.reduce(
      (acc, item) => acc.add(item.subtotal),
      new Prisma.Decimal(0)
    );
    const desconto = new Prisma.Decimal(data.desconto || 0);
    const total = subtotal.sub(desconto);

    const pagamentosData = data.pagamentos && data.pagamentos.length > 0
      ? data.pagamentos.map((p) => ({
          formaPagamento: p.formaPagamento as FormaPagamento,
          valor: new Prisma.Decimal(p.valor),
        }))
      : [{ formaPagamento: data.formaPagamento as FormaPagamento, valor: total }];

    const venda = await tx.venda.create({
      data: {
        numero,
        tenantId,
        clienteId: data.clienteId || null,
        vendedorId,
        subtotal,
        desconto,
        total,
        formaPagamento: data.formaPagamento,
        status: "CONCLUIDA",
        observacoes: data.observacoes,
        qtdParcelas: data.qtdParcelas || 1,
        caixaId: data.caixaId || null,
        itens: { create: itensData },
        pagamentos: { create: pagamentosData },
      },
      include: {
        itens: {
          include: {
            variante: {
              include: { produto: { select: { nome: true } } },
            },
          },
        },
        cliente: { select: { nome: true } },
        pagamentos: true,
        contasReceber: {
          select: { id: true, valor: true, dataVencimento: true, status: true },
        },
      },
    });

    for (const item of data.itens) {
      await tx.produtoVariante.update({
        where: { id: item.varianteId },
        data: {
          qtdEstoque: { decrement: item.quantidade },
          qtdDisponivel: { decrement: item.quantidade },
        },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          varianteId: item.varianteId,
          tipo: "SAIDA",
          quantidade: -item.quantidade,
          observacao: `Venda #${numero}`,
        },
      });
    }

    for (const pag of pagamentosData) {
      if (pag.formaPagamento === "CREDITO_LOJA" && venda.clienteId) {
        await tx.cliente.update({
          where: { id: venda.clienteId },
          data: { creditoAtual: { decrement: pag.valor } },
        });
      }
    }

    if (data.caixaId) {
      for (const pag of pagamentosData) {
        await tx.caixaMovimento.create({
          data: {
            caixaId: data.caixaId,
            tipo: "VENDA",
            valor: pag.valor,
            formaPagamento: pag.formaPagamento as FPEnum,
            vendaId: venda.id,
            descricao: `Venda #${numero}`,
          },
        });
      }
    }

    const contasReceberData = gerarContasReceberMultiplos(
      pagamentosData,
      total,
      venda,
      tenantId
    );
    if (contasReceberData.length > 0) {
      await tx.contaReceber.createMany({ data: contasReceberData });
    }

    return venda;
  });
}

function gerarContasReceberMultiplos(
  pagamentos: { formaPagamento: FormaPagamento; valor: Prisma.Decimal }[],
  _total: Prisma.Decimal,
  venda: { id: string; clienteId: string | null; numero: number; qtdParcelas?: number | null },
  tenantId: string
) {
  const hoje = new Date();
  const resultado: {
    descricao: string;
    valor: Prisma.Decimal;
    dataVencimento: Date;
    dataRecebimento?: Date;
    status: "PENDENTE" | "PAGO";
    categoria: "VENDA";
    formaPagamento: FormaPagamento;
    clienteId: string | null;
    vendaId: string;
    observacoes: string;
    tenantId: string;
  }[] = [];

  for (const pag of pagamentos) {
    if (pag.formaPagamento === "DINHEIRO" || pag.formaPagamento === "PIX" || pag.formaPagamento === "CREDITO_LOJA") continue;

    if (pag.formaPagamento === "DEBITO") {
      resultado.push({
        descricao: `Venda #${venda.numero} - Débito`,
        valor: pag.valor,
        dataVencimento: hoje,
        dataRecebimento: hoje,
        status: "PAGO",
        categoria: "VENDA",
        formaPagamento: "DEBITO",
        clienteId: venda.clienteId,
        vendaId: venda.id,
        observacoes: `Venda #${venda.numero} - Débito`,
        tenantId,
      });
      continue;
    }

    if (pag.formaPagamento === "CREDITO") {
      const vencimento = new Date(hoje);
      vencimento.setDate(vencimento.getDate() + 30);
      resultado.push({
        descricao: `Venda #${venda.numero} - Crédito`,
        valor: pag.valor,
        dataVencimento: vencimento,
        status: "PENDENTE",
        categoria: "VENDA",
        formaPagamento: "CREDITO",
        clienteId: venda.clienteId,
        vendaId: venda.id,
        observacoes: `Venda #${venda.numero} - Crédito 30 dias`,
        tenantId,
      });
      continue;
    }

    if (pag.formaPagamento === "BOLETO") {
      const vencimento = new Date(hoje);
      vencimento.setDate(vencimento.getDate() + 3);
      resultado.push({
        descricao: `Venda #${venda.numero} - Boleto`,
        valor: pag.valor,
        dataVencimento: vencimento,
        status: "PENDENTE",
        categoria: "VENDA",
        formaPagamento: "BOLETO",
        clienteId: venda.clienteId,
        vendaId: venda.id,
        observacoes: `Venda #${venda.numero} - Boleto 3 dias`,
        tenantId,
      });
    }

    if (pag.formaPagamento === "DUPLICATA") {
      const numParcelas = venda.qtdParcelas || 1;
      const valorParcela = pag.valor.div(numParcelas).toDecimalPlaces(2);
      let somaParcelas = new Prisma.Decimal(0);
      for (let i = 1; i <= numParcelas; i++) {
        const vencimento = new Date(hoje);
        vencimento.setDate(vencimento.getDate() + 30 * i);
        const valorFinal = i === numParcelas ? pag.valor.sub(somaParcelas) : valorParcela;
        somaParcelas = somaParcelas.add(valorFinal);
        resultado.push({
          descricao: `Venda #${venda.numero} - Duplicata ${i}/${numParcelas}`,
          valor: valorFinal,
          dataVencimento: vencimento,
          status: "PENDENTE",
          categoria: "VENDA",
          formaPagamento: "DUPLICATA",
          clienteId: venda.clienteId,
          vendaId: venda.id,
          observacoes: `Venda #${venda.numero} - Duplicata ${i}/${numParcelas} - ${numParcelas}x`,
          tenantId,
        });
      }
    }
  }

  return resultado;
}

export async function listarVendas(tenantId: string, limit = 50) {
  return prisma.venda.findMany({
    where: { tenantId },
    include: {
      cliente: { select: { id: true, nome: true } },
      vendedor: { select: { id: true, name: true } },
      itens: {
        include: {
          variante: {
            include: { produto: { select: { nome: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getVendaById(tenantId: string, vendaId: string) {
  return prisma.venda.findFirst({
    where: { id: vendaId, tenantId },
    include: {
      cliente: { select: { id: true, nome: true, telefone: true, cpf: true, creditoAtual: true } },
      vendedor: { select: { id: true, name: true } },
      itens: {
        include: {
          variante: {
            include: { produto: { select: { nome: true, marca: true } } },
          },
        },
      },
      pagamentos: true,
      contasReceber: {
        select: { id: true, descricao: true, valor: true, dataVencimento: true, dataRecebimento: true, status: true, formaPagamento: true },
      },
    },
  });
}

export type DevolucaoInput = {
  itens: { vendaItemId: string; quantidade: number }[];
  tipoEstorno: "DINHEIRO" | "CREDITO_LOJA";
  motivo?: string;
};

export async function devolverItensVenda(
  tenantId: string,
  vendaId: string,
  data: DevolucaoInput
) {
  return prisma.$transaction(async (tx) => {
    const venda = await tx.venda.findFirst({
      where: { id: vendaId, tenantId },
      include: { itens: true },
    });

    if (!venda) throw new VendaError("NAO_ENCONTRADA", "Venda não encontrada");
    if (venda.status === "DEVOLVIDA")
      throw new VendaError("JA_DEVOLVIDA", "Venda já foi totalmente devolvida");
    if (venda.status === "CANCELADA")
      throw new VendaError("CANCELADA", "Venda cancelada não pode ser devolvida");

    let valorTotalDevolvido = new Prisma.Decimal(0);
    const subtotalVenda = new Prisma.Decimal(Number(venda.subtotal));
    const descontoVenda = new Prisma.Decimal(Number(venda.desconto));
    // Usa Number para divisão (Decimal.div estático não funciona no Prisma v5)
    const proporcaoDesconto = subtotalVenda.gt(0)
      ? Number(descontoVenda) / Number(subtotalVenda)
      : 0;

    for (const item of data.itens) {
      const vendaItem = venda.itens.find((i) => i.id === item.vendaItemId);
      if (!vendaItem)
        throw new VendaError("ITEM_NAO_ENCONTRADO", "Item da venda não encontrado");

      const qtdJaDevolvida = vendaItem.qtdDevolvida || 0;
      const qtdDisponivel = vendaItem.quantidade - qtdJaDevolvida;

      if (item.quantidade > qtdDisponivel)
        throw new VendaError(
          "QTD_EXCEDIDA",
          `Quantidade a devolver (${item.quantidade}) excede o disponível (${qtdDisponivel}) para este item`
        );
    }

    for (const item of data.itens) {
      const vendaItem = venda.itens.find((i) => i.id === item.vendaItemId)!;
      const variante = await tx.produtoVariante.findUnique({
        where: { id: vendaItem.varianteId },
      });
      if (!variante) throw new VendaError("VARIANTE_NAO_ENCONTRADA", "Variação não encontrada");

      await tx.vendaItem.update({
        where: { id: item.vendaItemId },
        data: { qtdDevolvida: { increment: item.quantidade } },
      });

      await tx.produtoVariante.update({
        where: { id: vendaItem.varianteId },
        data: {
          qtdEstoque: { increment: item.quantidade },
          qtdDisponivel: { increment: item.quantidade },
        },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          varianteId: vendaItem.varianteId,
          tipo: "DEVOLUCAO",
          quantidade: item.quantidade,
          observacao: `Devolução Venda #${venda.numero}${data.motivo ? ` - ${data.motivo}` : ""}`,
        },
      });

      const subtotalItem = new Prisma.Decimal(Number(vendaItem.subtotal));
      const valorComDesconto = subtotalItem.mul(1 - proporcaoDesconto);
      const proporcaoQtd = new Prisma.Decimal(item.quantidade).div(
        new Prisma.Decimal(vendaItem.quantidade)
      );
      const valorItemDevolvido = valorComDesconto.mul(proporcaoQtd);

      valorTotalDevolvido = valorTotalDevolvido.add(valorItemDevolvido);
    }

    if (data.tipoEstorno === "DINHEIRO") {
      await tx.movimentacaoCaixa.create({
        data: {
          tenantId,
          tipo: "SAIDA",
          valor: valorTotalDevolvido,
          descricao: `Devolução Venda #${venda.numero} - Dinheiro${data.motivo ? ` (${data.motivo})` : ""}`,
          categoria: "DEVOLUCAO",
          referenciaId: vendaId,
        },
      });
    } else if (data.tipoEstorno === "CREDITO_LOJA") {
      if (venda.clienteId) {
        await tx.cliente.update({
          where: { id: venda.clienteId },
          data: { creditoAtual: { increment: valorTotalDevolvido } },
        });
      }
      await tx.movimentacaoCaixa.create({
        data: {
          tenantId,
          tipo: "SAIDA",
          valor: valorTotalDevolvido,
          descricao: `Crédito Loja - Devolução Venda #${venda.numero}${data.motivo ? ` (${data.motivo})` : ""}`,
          categoria: "DEVOLUCAO",
          referenciaId: vendaId,
        },
      });
    }

    const todosDevolvidos = venda.itens.every((vi) => {
      const qtdDevolvendo = data.itens
        .filter((d) => d.vendaItemId === vi.id)
        .reduce((acc, d) => acc + d.quantidade, 0);
      return (vi.qtdDevolvida || 0) + qtdDevolvendo >= vi.quantidade;
    });

    if (todosDevolvidos) {
      await tx.venda.update({
        where: { id: vendaId },
        data: { status: "DEVOLVIDA" },
      });
    }

    await tx.contaReceber.updateMany({
      where: { vendaId, status: "PENDENTE" },
      data: { status: "CANCELADO" },
    });

    return { valorDevolvido: Number(valorTotalDevolvido), todosDevolvidos };
  });
}