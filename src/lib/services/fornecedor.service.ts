import prisma from "@/lib/prisma";
import type { CreateFornecedorInput, UpdateFornecedorInput } from "@/lib/validations/fornecedor";

export class FornecedorError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "FornecedorError";
  }
}

export async function listarFornecedores(tenantId: string) {
  return prisma.fornecedor.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
  });
}

export async function buscarFornecedor(tenantId: string, id: string) {
  const fornecedor = await prisma.fornecedor.findFirst({
    where: { id, tenantId },
  });

  if (!fornecedor) {
    throw new FornecedorError("NAO_ENCONTRADO", "Fornecedor não encontrado");
  }

  return fornecedor;
}

export async function criarFornecedor(tenantId: string, data: CreateFornecedorInput) {
  const fornecedor = await prisma.fornecedor.create({
    data: {
      ...data,
      cnpj: data.cnpj || null,
      telefone: data.telefone || null,
      email: data.email || null,
      endereco: data.endereco || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      cep: data.cep || null,
      observacoes: data.observacoes || null,
      tenantId,
    },
  });

  return fornecedor;
}

export async function atualizarFornecedor(
  tenantId: string,
  id: string,
  data: UpdateFornecedorInput
) {
  const existente = await prisma.fornecedor.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new FornecedorError("NAO_ENCONTRADO", "Fornecedor não encontrado");
  }

  const fornecedor = await prisma.fornecedor.update({
    where: { id },
    data: {
      ...data,
      cnpj: data.cnpj || null,
      telefone: data.telefone || null,
      email: data.email || null,
      endereco: data.endereco || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      cep: data.cep || null,
      observacoes: data.observacoes || null,
    },
  });

  return fornecedor;
}

export async function excluirFornecedor(tenantId: string, id: string) {
  const existente = await prisma.fornecedor.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new FornecedorError("NAO_ENCONTRADO", "Fornecedor não encontrado");
  }

  const produtosVinculados = await prisma.produto.count({
    where: { fornecedorId: id },
  });

  if (produtosVinculados > 0) {
    throw new FornecedorError(
      "POSSUI_PRODUTOS",
      `Este fornecedor possui ${produtosVinculados} produto(s) vinculado(s). Remova os vínculos antes de excluir.`
    );
  }

  await prisma.fornecedor.delete({ where: { id } });
}
