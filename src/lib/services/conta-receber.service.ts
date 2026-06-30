import prisma from "@/lib/prisma";
import type { CreateContaReceberInput, UpdateContaReceberInput } from "@/lib/validations/conta-receber";
import type { StatusConta, CategoriaContaReceber, FormaPagamento } from "@prisma/client";

export class ContaReceberError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ContaReceberError";
  }
}

export async function listarContasReceber(tenantId: string) {
  return prisma.contaReceber.findMany({
    where: { tenantId },
    include: { cliente: { select: { id: true, nome: true } } },
    orderBy: [{ status: "asc" }, { dataVencimento: "asc" }],
  });
}

export async function buscarContaReceber(tenantId: string, id: string) {
  const conta = await prisma.contaReceber.findFirst({
    where: { id, tenantId },
    include: { cliente: { select: { id: true, nome: true } } },
  });

  if (!conta) throw new ContaReceberError("NAO_ENCONTRADA", "Conta não encontrada");
  return conta;
}

export async function criarContaReceber(tenantId: string, data: CreateContaReceberInput) {
  return prisma.contaReceber.create({
    data: {
      descricao: data.descricao,
      valor: parseFloat(data.valor),
      dataVencimento: new Date(data.dataVencimento),
      dataRecebimento: data.dataRecebimento ? new Date(data.dataRecebimento) : null,
      status: (data.status as StatusConta) || "PENDENTE",
      categoria: (data.categoria as CategoriaContaReceber) || "CLIENTE",
      formaPagamento: (data.formaPagamento as FormaPagamento) || null,
      clienteId: data.clienteId || null,
      vendaId: data.vendaId || null,
      observacoes: data.observacoes || null,
      tenantId,
    },
  });
}

export async function atualizarContaReceber(tenantId: string, id: string, data: UpdateContaReceberInput) {
  const existente = await prisma.contaReceber.findFirst({ where: { id, tenantId } });
  if (!existente) throw new ContaReceberError("NAO_ENCONTRADA", "Conta não encontrada");

  return prisma.contaReceber.update({
    where: { id },
    data: {
      descricao: data.descricao,
      valor: parseFloat(data.valor),
      dataVencimento: new Date(data.dataVencimento),
      dataRecebimento: data.dataRecebimento ? new Date(data.dataRecebimento) : null,
      status: (data.status as StatusConta) || "PENDENTE",
      categoria: (data.categoria as CategoriaContaReceber) || "CLIENTE",
      formaPagamento: (data.formaPagamento as FormaPagamento) || null,
      clienteId: data.clienteId || null,
      vendaId: data.vendaId || null,
      observacoes: data.observacoes || null,
    },
  });
}

export async function receberConta(
  tenantId: string,
  id: string,
  dados: {
    dataPagamento: string;
    valorPago: number;
    juros?: number;
    multa?: number;
    desconto?: number;
    formaPagamento?: string;
    numeroDocumento?: string;
    observacoes?: string;
  }
) {
  const existente = await prisma.contaReceber.findFirst({ where: { id, tenantId } });
  if (!existente) throw new ContaReceberError("NAO_ENCONTRADA", "Conta não encontrada");
  if (existente.status === "PAGO") throw new ContaReceberError("JA_RECEBIDA", "Conta já foi recebida");

  await prisma.contaReceber.update({
    where: { id },
    data: {
      status: "PAGO",
      dataRecebimento: new Date(dados.dataPagamento),
      valorRecebido: dados.valorPago,
      juros: dados.juros ?? 0,
      multa: dados.multa ?? 0,
      desconto: dados.desconto ?? 0,
      formaPagamento: (dados.formaPagamento as any) ?? existente.formaPagamento ?? null,
      numeroDocumento: dados.numeroDocumento ?? null,
      observacoes: dados.observacoes
        ? (existente.observacoes
            ? `${existente.observacoes}\n[Recebimento] ${dados.observacoes}`
            : `[Recebimento] ${dados.observacoes}`)
        : existente.observacoes,
    },
  });
}

export async function excluirContaReceber(tenantId: string, id: string) {
  const existente = await prisma.contaReceber.findFirst({ where: { id, tenantId } });
  if (!existente) throw new ContaReceberError("NAO_ENCONTRADA", "Conta não encontrada");

  await prisma.contaReceber.delete({ where: { id } });
}
