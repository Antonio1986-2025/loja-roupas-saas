import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  CreateVendaCondicionalInput,
  FinalizarVendaCondicionalInput,
} from "@/lib/validations/venda-condicional";
import { calcularDataVencimento, calcularSubtotalItem, temEstoqueDisponivel } from "@/lib/calculations/condicional";

type FormaPagamento = "DINHEIRO" | "DEBITO" | "CREDITO" | "PIX" | "BOLETO";

export class VendaCondicionalError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "VendaCondicionalError";
  }
}

type ListFilters = {
  status?: "ATIVA" | "FINALIZADA" | "CANCELADA" | "VENCIDA";
  clienteId?: string;
  numero?: number;
  page?: number;
  limit?: number;
};

/**
 * Lista vendas condicionais com filtros e paginação.
 */
export async function listarVendasCondicionais(tenantId: string, filters: ListFilters = {}) {
  const { status, clienteId, numero, page = 1, limit = 20 } = filters;

  const where: Prisma.VendaCondicionalWhereInput = { tenantId };

  if (status === "VENCIDA") {
    where.status = "ATIVA";
    where.dataVencimento = { lt: new Date() };
  } else if (status) {
    where.status = status;
  }

  if (clienteId) where.clienteId = clienteId;
  if (numero) where.numero = numero;

  const [data, total] = await Promise.all([
    prisma.vendaCondicional.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        itens: { select: { id: true, quantidade: true, subtotal: true } },
      },
      orderBy: { dataVencimento: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendaCondicional.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Busca uma venda condicional com todos os detalhes.
 */
export async function buscarVendaCondicional(tenantId: string, id: string) {
  const condicional = await prisma.vendaCondicional.findFirst({
    where: { id, tenantId },
    include: {
      cliente: true,
      itens: {
        include: {
          variante: {
            include: { produto: { select: { nome: true } } },
          },
        },
      },
      vendaGerada: { select: { id: true, numero: true, total: true } },
    },
  });

  if (!condicional) {
    throw new VendaCondicionalError("NAO_ENCONTRADA", "Venda condicional não encontrada");
  }

  return condicional;
}

/**
 * Cria uma nova venda condicional, reservando estoque.
 */
export async function criarVendaCondicional(
  tenantId: string,
  vendedorId: string | null,
  data: CreateVendaCondicionalInput
) {
  return prisma.$transaction(async (tx) => {
    // 1. Validar cliente
    const cliente = await tx.cliente.findFirst({
      where: { id: data.clienteId, tenantId },
    });
    if (!cliente) {
      throw new VendaCondicionalError("CLIENTE_NAO_ENCONTRADO", "Cliente não encontrado");
    }

    // 2. Validar estoque disponível e carregar preços
    const itensData: {
      varianteId: string;
      quantidade: number;
      precoUnit: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }[] = [];

    for (const item of data.itens) {
      const variante = await tx.produtoVariante.findUnique({
        where: { id: item.varianteId },
        include: { produto: { select: { precoVenda: true, nome: true } } },
      });

      if (!variante) {
        throw new VendaCondicionalError("VARIANTE_NAO_ENCONTRADA", "Produto não encontrado");
      }
      if (!temEstoqueDisponivel(variante.qtdDisponivel, item.quantidade)) {
        throw new VendaCondicionalError(
          "ESTOQUE_INSUFICIENTE",
          `Estoque insuficiente para ${variante.produto.nome}`
        );
      }

      const preco = variante.precoVenda ?? variante.produto.precoVenda;
      itensData.push({
        varianteId: item.varianteId,
        quantidade: item.quantidade,
        precoUnit: preco,
        subtotal: calcularSubtotalItem(preco, item.quantidade),
      });
    }

    // 3. Próximo número
    const ultima = await tx.vendaCondicional.findFirst({
      where: { tenantId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const numero = (ultima?.numero ?? 0) + 1;

    // 4. Datas
    const dataSaida = new Date();
    const dataVencimento = calcularDataVencimento(dataSaida, data.prazoDias);

    // 5. Criar condicional + itens
    const condicional = await tx.vendaCondicional.create({
      data: {
        numero,
        tenantId,
        clienteId: data.clienteId,
        vendedorId,
        dataSaida,
        dataVencimento,
        prazoDias: data.prazoDias,
        status: "ATIVA",
        observacoes: data.observacoes,
        itens: { create: itensData },
      },
    });

    // 6. Reservar estoque (disponível -> condicional) + movimentação
    for (const item of data.itens) {
      await tx.produtoVariante.update({
        where: { id: item.varianteId },
        data: {
          qtdDisponivel: { decrement: item.quantidade },
          qtdCondicional: { increment: item.quantidade },
        },
      });
      await tx.movimentacaoEstoque.create({
        data: {
          varianteId: item.varianteId,
          tipo: "SAIDA",
          quantidade: -item.quantidade,
          observacao: `Condicional #${numero}`,
        },
      });
    }

    return condicional;
  });
}

/**
 * Finaliza uma condicional: classifica itens, devolve estoque dos devolvidos,
 * baixa estoque dos comprados e gera venda dos comprados.
 */
export async function finalizarVendaCondicional(
  tenantId: string,
  vendedorId: string | null,
  id: string,
  data: FinalizarVendaCondicionalInput
) {
  return prisma.$transaction(async (tx) => {
    const condicional = await tx.vendaCondicional.findFirst({
      where: { id, tenantId },
      include: { itens: true },
    });

    if (!condicional) {
      throw new VendaCondicionalError("NAO_ENCONTRADA", "Venda condicional não encontrada");
    }
    if (condicional.status !== "ATIVA") {
      throw new VendaCondicionalError(
        "JA_FINALIZADA",
        "Esta condicional já foi finalizada ou cancelada"
      );
    }

    // Todos os itens devem ser classificados
    if (data.itens.length !== condicional.itens.length) {
      throw new VendaCondicionalError(
        "ITENS_NAO_CLASSIFICADOS",
        "Todos os itens devem ser classificados como comprado ou devolvido"
      );
    }

    const comprados: typeof condicional.itens = [];

    for (const update of data.itens) {
      const item = condicional.itens.find((i) => i.id === update.itemId);
      if (!item) {
        throw new VendaCondicionalError("ITEM_INVALIDO", "Item não pertence à condicional");
      }

      await tx.vendaCondicionalItem.update({
        where: { id: item.id },
        data: { statusFinal: update.status },
      });

      if (update.status === "DEVOLVIDO") {
        await tx.produtoVariante.update({
          where: { id: item.varianteId },
          data: {
            qtdDisponivel: { increment: item.quantidade },
            qtdCondicional: { decrement: item.quantidade },
          },
        });
        await tx.movimentacaoEstoque.create({
          data: {
            varianteId: item.varianteId,
            tipo: "DEVOLUCAO",
            quantidade: item.quantidade,
            observacao: `Devolução condicional #${condicional.numero}`,
          },
        });
      } else {
        // COMPRADO: apenas sai do condicional (disponível já foi decrementado na criação)
        await tx.produtoVariante.update({
          where: { id: item.varianteId },
          data: {
            qtdCondicional: { decrement: item.quantidade },
            qtdEstoque: { decrement: item.quantidade },
          },
        });
        comprados.push(item);
      }
    }

    let vendaGerada: { id: string; numero: number; total: Prisma.Decimal } | null = null;

    if (comprados.length > 0) {
      if (!data.formaPagamento) {
        throw new VendaCondicionalError(
          "FORMA_PAGAMENTO_OBRIGATORIA",
          "Selecione a forma de pagamento para os itens comprados"
        );
      }

      const subtotal = comprados.reduce(
        (acc, it) => acc.add(it.subtotal),
        new Prisma.Decimal(0)
      );

      const ultimaVenda = await tx.venda.findFirst({
        where: { tenantId },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numeroVenda = (ultimaVenda?.numero ?? 0) + 1;

      const venda = await tx.venda.create({
        data: {
          numero: numeroVenda,
          tenantId,
          clienteId: condicional.clienteId,
          vendedorId: vendedorId ?? condicional.vendedorId ?? "",
          subtotal,
          desconto: 0,
          total: subtotal,
          formaPagamento: data.formaPagamento,
          status: "CONCLUIDA",
          observacoes: `Originada da condicional #${condicional.numero}`,
          origemCondicionalId: condicional.id,
          itens: {
            create: comprados.map((it) => ({
              varianteId: it.varianteId,
              quantidade: it.quantidade,
              precoUnit: it.precoUnit,
              subtotal: it.subtotal,
            })),
          },
        },
        select: { id: true, numero: true, total: true },
      });

      const fp = data.formaPagamento as FormaPagamento;
      if (fp === "DEBITO") {
        await tx.contaReceber.create({
          data: {
            descricao: `Venda #${numeroVenda} - Débito`,
            valor: subtotal,
            dataVencimento: new Date(),
            dataRecebimento: new Date(),
            status: "PAGO",
            categoria: "VENDA",
            formaPagamento: "DEBITO",
            clienteId: condicional.clienteId,
            vendaId: venda.id,
            observacoes: `Venda #${numeroVenda} - Débito`,
            tenantId,
          },
        });
      } else if (fp === "CREDITO") {
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 30);
        await tx.contaReceber.create({
          data: {
            descricao: `Venda #${numeroVenda} - Crédito`,
            valor: subtotal,
            dataVencimento: vencimento,
            status: "PENDENTE",
            categoria: "VENDA",
            formaPagamento: "CREDITO",
            clienteId: condicional.clienteId,
            vendaId: venda.id,
            observacoes: `Venda #${numeroVenda} - Crédito 30 dias`,
            tenantId,
          },
        });
      } else if (fp === "BOLETO") {
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 3);
        await tx.contaReceber.create({
          data: {
            descricao: `Venda #${numeroVenda} - Boleto`,
            valor: subtotal,
            dataVencimento: vencimento,
            status: "PENDENTE",
            categoria: "VENDA",
            formaPagamento: "BOLETO",
            clienteId: condicional.clienteId,
            vendaId: venda.id,
            observacoes: `Venda #${numeroVenda} - Boleto 3 dias`,
            tenantId,
          },
        });
      }

      vendaGerada = venda;
    }

    await tx.vendaCondicional.update({
      where: { id },
      data: { status: "FINALIZADA", dataFinalizacao: new Date() },
    });

    return {
      condicionalId: id,
      vendaGerada,
      itensComprados: comprados.length,
      itensDevolvidos: condicional.itens.length - comprados.length,
    };
  });
}

/**
 * Cancela uma condicional ativa, devolvendo todo o estoque reservado.
 */
export async function cancelarVendaCondicional(tenantId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const condicional = await tx.vendaCondicional.findFirst({
      where: { id, tenantId },
      include: { itens: true },
    });

    if (!condicional) {
      throw new VendaCondicionalError("NAO_ENCONTRADA", "Venda condicional não encontrada");
    }
    if (condicional.status !== "ATIVA") {
      throw new VendaCondicionalError(
        "NAO_CANCELAVEL",
        "Apenas condicionais ativas podem ser canceladas"
      );
    }

    for (const item of condicional.itens) {
      await tx.produtoVariante.update({
        where: { id: item.varianteId },
        data: {
          qtdDisponivel: { increment: item.quantidade },
          qtdCondicional: { decrement: item.quantidade },
        },
      });
      await tx.movimentacaoEstoque.create({
        data: {
          varianteId: item.varianteId,
          tipo: "DEVOLUCAO",
          quantidade: item.quantidade,
          observacao: `Cancelamento condicional #${condicional.numero}`,
        },
      });
    }

    return tx.vendaCondicional.update({
      where: { id },
      data: { status: "CANCELADA", dataCancelamento: new Date() },
    });
  });
}

/**
 * Conta condicionais vencidas (ativas com data de vencimento passada).
 */
export async function contarVencidas(tenantId: string) {
  return prisma.vendaCondicional.count({
    where: { tenantId, status: "ATIVA", dataVencimento: { lt: new Date() } },
  });
}
