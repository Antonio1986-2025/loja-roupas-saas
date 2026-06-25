import prisma from "@/lib/prisma";
import type { CreateFuncionarioInput, UpdateFuncionarioInput } from "@/lib/validations/funcionario";

export class FuncionarioError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "FuncionarioError";
  }
}

export async function listarFuncionarios(tenantId: string) {
  return prisma.funcionario.findMany({
    where: { tenantId },
    orderBy: { nome: "asc" },
  });
}

export async function buscarFuncionario(tenantId: string, id: string) {
  const funcionario = await prisma.funcionario.findFirst({
    where: { id, tenantId },
  });

  if (!funcionario) {
    throw new FuncionarioError("NAO_ENCONTRADO", "Funcionário não encontrado");
  }

  return funcionario;
}

export async function criarFuncionario(tenantId: string, data: CreateFuncionarioInput) {
  const funcionario = await prisma.funcionario.create({
    data: {
      nome: data.nome,
      cpf: data.cpf,
      telefone: data.telefone || null,
      email: data.email || null,
      cargo: data.cargo || null,
      salario: data.salario ? parseFloat(data.salario) : null,
      dataAdmissao: new Date(data.dataAdmissao),
      dataDemissao: data.dataDemissao ? new Date(data.dataDemissao) : null,
      ativo: data.ativo ?? true,
      tenantId,
    },
  });

  return funcionario;
}

export async function atualizarFuncionario(
  tenantId: string,
  id: string,
  data: UpdateFuncionarioInput
) {
  const existente = await prisma.funcionario.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new FuncionarioError("NAO_ENCONTRADO", "Funcionário não encontrado");
  }

  const funcionario = await prisma.funcionario.update({
    where: { id },
    data: {
      nome: data.nome,
      cpf: data.cpf,
      telefone: data.telefone || null,
      email: data.email || null,
      cargo: data.cargo || null,
      salario: data.salario ? parseFloat(data.salario) : null,
      dataAdmissao: new Date(data.dataAdmissao),
      dataDemissao: data.dataDemissao ? new Date(data.dataDemissao) : null,
      ativo: data.ativo ?? true,
    },
  });

  return funcionario;
}

export async function excluirFuncionario(tenantId: string, id: string) {
  const existente = await prisma.funcionario.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new FuncionarioError("NAO_ENCONTRADO", "Funcionário não encontrado");
  }

  await prisma.funcionario.delete({ where: { id } });
}
