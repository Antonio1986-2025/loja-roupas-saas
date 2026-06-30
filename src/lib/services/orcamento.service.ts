import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { CreateOrcamentoInput, UpdateOrcamentoInput } from "@/lib/validations/orcamento";
import type { FormaPagamento as FPEnum } from "@prisma/client";

export class OrcamentoError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "OrcamentoError";
  }
}

export async function listarOrcamentos(
  tenantId: string,
  filtros?: { status?: string; page?: number; limit?: number }
) {
  const page = filtros?.page ?? 1;
  const limit = filtros?.limit ?? 20;
  const skip = (page - 1) * limit;

  const agora = new Date();

  // Auto-expire: mark as EXPIRADO where needed
  await prisma.orcamento.updateMany({
    where: {
      tenantId,
      status: "ABERTO",
      dataValidade: { lt: agora },
    },
    data: { status: "EXPIRADO" },
  });

  const where: Prisma.OrcamentoWhereInput = { tenantId };
  if (filtros?.status && filtros.status !== "TODOS") {
    where.status = filtros.status as any;
  }

  const [data, total] = await Promise.all([
    prisma.orcamento.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true } },
        vendedor: { select: { id: true, name: true } },
        itens: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.orcamento.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function buscarOrcamento(tenantId: string, id: string) {
  const agora = new Date();

  // Auto-expire if needed
  await prisma.orcamento.updateMany({
    where: {
      id,
      tenantId,
      status: "ABERTO",
      dataValidade: { lt: agora },
    },
    data: { status: "EXPIRADO" },
  });

  return prisma.orcamento.findFirst({
    where: { id, tenantId },
    include: {
      cliente: { select: { id: true, nome: true, telefone: true, cpf: true } },
      vendedor: { select: { id: true, name: true } },
      itens: {
        include: {
          variante: {
            include: {
              produto: { select: { nome: true, marca: true } },
            },
          },
        },
      },
      vendaGerada: { select: { id: true, numero: true } },
    },
  });
}

export async function criarOrcamento(
  tenantId: string,
  vendedorId: string,
  data: CreateOrcamentoInput
) {
  const ultima = await prisma.orcamento.findFirst({
    where: { tenantId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const numero = (ultima?.numero ?? 0) + 1;

  const validadeDias = data.validadeDias ?? 7;
  const dataValidade = new Date();
  dataValidade.setDate(dataValidade.getDate() + validadeDias);

  const subtotal = data.itens.reduce((sum, item) => sum + item.subtotal, 0);
  const desconto = data.desconto ?? 0;
  const total = Math.max(0, subtotal - desconto);

  const orcamento = await prisma.orcamento.create({
    data: {
      numero,
      tenantId,
      clienteId: data.clienteId || null,
      vendedorId,
      status: "ABERTO",
      validadeDias,
      dataValidade,
      subtotal: new Prisma.Decimal(subtotal),
      desconto: new Prisma.Decimal(desconto),
      total: new Prisma.Decimal(total),
      formaPagamento: (data.formaPagamento as FPEnum) ?? null,
      observacoes: data.observacoes || null,
      itens: {
        create: data.itens.map((item) => ({
          varianteId: item.varianteId,
          quantidade: item.quantidade,
          precoUnit: new Prisma.Decimal(item.precoUnit),
          desconto: new Prisma.Decimal(item.desconto ?? 0),
          subtotal: new Prisma.Decimal(item.subtotal),
        })),
      },
    },
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
  });

  return orcamento;
}

export async function atualizarOrcamento(
  tenantId: string,
  id: string,
  data: UpdateOrcamentoInput
) {
  const orcamento = await prisma.orcamento.findFirst({
    where: { id, tenantId },
  });

  if (!orcamento) {
    throw new OrcamentoError("NAO_ENCONTRADO", "Orçamento não encontrado");
  }

  if (orcamento.status !== "ABERTO") {
    throw new OrcamentoError(
      "STATUS_INVALIDO",
      "Somente orçamentos em aberto podem ser editados"
    );
  }

  const updateData: Prisma.OrcamentoUpdateInput = {};

  if (data.clienteId !== undefined) {
    updateData.cliente = data.clienteId
      ? { connect: { id: data.clienteId } }
      : { disconnect: true };
  }
  if (data.formaPagamento !== undefined)
    updateData.formaPagamento = (data.formaPagamento as FPEnum) ?? null;
  if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;

  if (data.validadeDias !== undefined) {
    updateData.validadeDias = data.validadeDias;
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + data.validadeDias);
    updateData.dataValidade = dataValidade;
  }

  if (data.itens) {
    const subtotal = data.itens.reduce((sum, item) => sum + item.subtotal, 0);
    const desconto = data.desconto ?? Number(orcamento.desconto);
    const total = Math.max(0, subtotal - desconto);

    updateData.subtotal = new Prisma.Decimal(subtotal);
    updateData.desconto = new Prisma.Decimal(desconto);
    updateData.total = new Prisma.Decimal(total);

    // Replace all items
    await prisma.orcamentoItem.deleteMany({ where: { orcamentoId: id } });
    updateData.itens = {
      create: data.itens.map((item) => ({
        varianteId: item.varianteId,
        quantidade: item.quantidade,
        precoUnit: new Prisma.Decimal(item.precoUnit),
        desconto: new Prisma.Decimal(item.desconto ?? 0),
        subtotal: new Prisma.Decimal(item.subtotal),
      })),
    };
  } else if (data.desconto !== undefined) {
    const currentSubtotal = Number(orcamento.subtotal);
    const total = Math.max(0, currentSubtotal - data.desconto);
    updateData.desconto = new Prisma.Decimal(data.desconto);
    updateData.total = new Prisma.Decimal(total);
  }

  return prisma.orcamento.update({
    where: { id },
    data: updateData,
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
  });
}

export async function cancelarOrcamento(tenantId: string, id: string) {
  const orcamento = await prisma.orcamento.findFirst({
    where: { id, tenantId },
  });

  if (!orcamento) {
    throw new OrcamentoError("NAO_ENCONTRADO", "Orçamento não encontrado");
  }

  if (orcamento.status !== "ABERTO") {
    throw new OrcamentoError(
      "STATUS_INVALIDO",
      "Somente orçamentos em aberto podem ser cancelados"
    );
  }

  return prisma.orcamento.update({
    where: { id },
    data: { status: "CANCELADO" },
  });
}

export async function converterEmVenda(
  tenantId: string,
  id: string,
  vendedorId: string,
  caixaId?: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Find orcamento with items
    const orcamento = await tx.orcamento.findFirst({
      where: { id, tenantId },
      include: { itens: true },
    });

    if (!orcamento) {
      throw new OrcamentoError("NAO_ENCONTRADO", "Orçamento não encontrado");
    }

    if (orcamento.status !== "ABERTO") {
      throw new OrcamentoError(
        "STATUS_INVALIDO",
        "Somente orçamentos em aberto podem ser convertidos em venda"
      );
    }

    // Check if expired
    const agora = new Date();
    if (orcamento.dataValidade < agora) {
      // Mark as expired and reject
      await tx.orcamento.update({
        where: { id },
        data: { status: "EXPIRADO" },
      });
      throw new OrcamentoError(
        "EXPIRADO",
        "Este orçamento está expirado e não pode ser convertido"
      );
    }

    // 2. Get next venda numero
    const ultimaVenda = await tx.venda.findFirst({
      where: { tenantId },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const numero = (ultimaVenda?.numero ?? 0) + 1;

    const formaPagamento = (orcamento.formaPagamento ?? "PIX") as FPEnum;

    // 3. Create Venda
    const venda = await tx.venda.create({
      data: {
        numero,
        tenantId,
        clienteId: orcamento.clienteId,
        vendedorId,
        subtotal: orcamento.subtotal,
        desconto: orcamento.desconto,
        total: orcamento.total,
        formaPagamento,
        status: "CONCLUIDA",
        caixaId: caixaId || null,
        // 4. Create VendaItem for each OrcamentoItem using frozen precoUnit
        itens: {
          create: orcamento.itens.map((item) => ({
            varianteId: item.varianteId,
            quantidade: item.quantidade,
            precoUnit: item.precoUnit,
            subtotal: item.subtotal,
          })),
        },
        // 5. Create VendaPagamento
        pagamentos: {
          create: [
            {
              formaPagamento,
              valor: orcamento.total,
            },
          ],
        },
      },
    });

    // 6. Update stock and create MovimentacaoEstoque for each item
    for (const item of orcamento.itens) {
      await tx.produtoVariante.update({
        where: { id: item.varianteId },
        data: {
          qtdEstoque: { decrement: item.quantidade },
          qtdDisponivel: { decrement: item.quantidade },
        },
      });

      // 7. Create MovimentacaoEstoque (SAIDA)
      await tx.movimentacaoEstoque.create({
        data: {
          varianteId: item.varianteId,
          tipo: "SAIDA",
          quantidade: -item.quantidade,
          observacao: `Venda #${numero} - Orçamento #${orcamento.numero}`,
        },
      });
    }

    // 8. Update Orcamento: status = CONVERTIDO, vendaId = venda.id
    await tx.orcamento.update({
      where: { id },
      data: {
        status: "CONVERTIDO",
        vendaId: venda.id,
      },
    });

    // 9. Return venda.id
    return venda.id;
  });
}
