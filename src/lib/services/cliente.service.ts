import prisma from "@/lib/prisma";
import type { CreateClienteInput, UpdateClienteInput } from "@/lib/validations/cliente";

export class ClienteError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ClienteError";
  }
}

export async function listarClientes(tenantId: string) {
  return prisma.cliente.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
  });
}

export async function buscarCliente(tenantId: string, id: string) {
  const cliente = await prisma.cliente.findFirst({
    where: { id, tenantId },
    include: {
      _count: { select: { vendas: true, vendasCondicionais: true } },
    },
  });

  if (!cliente) {
    throw new ClienteError("NAO_ENCONTRADO", "Cliente não encontrado");
  }

  return cliente;
}

export async function criarCliente(tenantId: string, data: CreateClienteInput) {
  return prisma.cliente.create({
    data: {
      ...data,
      cpf: data.cpf || null,
      telefone: data.telefone || null,
      email: data.email || null,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
      endereco: data.endereco || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      cep: data.cep || null,
      observacoes: data.observacoes || null,
      tenantId,
    },
  });
}

export async function atualizarCliente(tenantId: string, id: string, data: UpdateClienteInput) {
  const existente = await prisma.cliente.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new ClienteError("NAO_ENCONTRADO", "Cliente não encontrado");
  }

  return prisma.cliente.update({
    where: { id },
    data: {
      ...data,
      cpf: data.cpf || null,
      telefone: data.telefone || null,
      email: data.email || null,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
      endereco: data.endereco || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      cep: data.cep || null,
      observacoes: data.observacoes || null,
    },
  });
}

export async function excluirCliente(tenantId: string, id: string) {
  const existente = await prisma.cliente.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new ClienteError("NAO_ENCONTRADO", "Cliente não encontrado");
  }

  const vendasVinculadas = await prisma.venda.count({
    where: { clienteId: id },
  });

  if (vendasVinculadas > 0) {
    throw new ClienteError(
      "POSSUI_VENDAS",
      `Este cliente possui ${vendasVinculadas} venda(s) vinculada(s). Não é possível excluir.`
    );
  }

  await prisma.cliente.delete({ where: { id } });
}
