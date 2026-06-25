import prisma from "@/lib/prisma";
import type { CreateContaPagarInput, UpdateContaPagarInput } from "@/lib/validations/conta-pagar";
import type { StatusConta, CategoriaContaPagar } from "@prisma/client";

export class ContaPagarError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ContaPagarError";
  }
}

export async function listarContasPagar(tenantId: string) {
  return prisma.contaPagar.findMany({
    where: { tenantId },
    include: { fornecedor: { select: { id: true, nome: true } } },
    orderBy: [{ status: "asc" }, { dataVencimento: "asc" }],
  });
}

export async function buscarContaPagar(tenantId: string, id: string) {
  const conta = await prisma.contaPagar.findFirst({
    where: { id, tenantId },
    include: { fornecedor: { select: { id: true, nome: true } } },
  });

  if (!conta) {
    throw new ContaPagarError("NAO_ENCONTRADA", "Conta não encontrada");
  }

  return conta;
}

export async function criarContaPagar(tenantId: string, data: CreateContaPagarInput) {
  return prisma.contaPagar.create({
    data: {
      descricao: data.descricao,
      valor: parseFloat(data.valor),
      dataVencimento: new Date(data.dataVencimento),
      dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
      status: (data.status as StatusConta) || "PENDENTE",
      categoria: (data.categoria as CategoriaContaPagar) || "OUTRO",
      fornecedorId: data.fornecedorId || null,
      observacoes: data.observacoes || null,
      tenantId,
    },
  });
}

export async function atualizarContaPagar(tenantId: string, id: string, data: UpdateContaPagarInput) {
  const existente = await prisma.contaPagar.findFirst({ where: { id, tenantId } });
  if (!existente) throw new ContaPagarError("NAO_ENCONTRADA", "Conta não encontrada");

  return prisma.contaPagar.update({
    where: { id },
    data: {
      descricao: data.descricao,
      valor: parseFloat(data.valor),
      dataVencimento: new Date(data.dataVencimento),
      dataPagamento: data.dataPagamento ? new Date(data.dataPagamento) : null,
      status: (data.status as StatusConta) || "PENDENTE",
      categoria: (data.categoria as CategoriaContaPagar) || "OUTRO",
      fornecedorId: data.fornecedorId || null,
      observacoes: data.observacoes || null,
    },
  });
}

export async function pagarConta(tenantId: string, id: string) {
  const existente = await prisma.contaPagar.findFirst({ where: { id, tenantId } });
  if (!existente) throw new ContaPagarError("NAO_ENCONTRADA", "Conta não encontrada");

  await prisma.contaPagar.update({
    where: { id },
    data: { status: "PAGO", dataPagamento: new Date() },
  });
}

export async function excluirContaPagar(tenantId: string, id: string) {
  const existente = await prisma.contaPagar.findFirst({ where: { id, tenantId } });
  if (!existente) throw new ContaPagarError("NAO_ENCONTRADA", "Conta não encontrada");

  await prisma.contaPagar.delete({ where: { id } });
}
