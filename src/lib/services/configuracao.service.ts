import prisma from "@/lib/prisma";
import type { UpdateConfiguracaoInput } from "@/lib/validations/configuracao";

export class ConfiguracaoError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ConfiguracaoError";
  }
}

export async function obterConfiguracao(tenantId: string) {
  let config = await prisma.configuracao.findUnique({
    where: { tenantId },
  });

  if (!config) {
    config = await prisma.configuracao.create({
      data: {
        tenantId,
        nomeEmpresa: "Minha Loja",
      },
    });
  }

  return {
    ...config,
    certificadoA1: config.certificadoA1 ? true : false,
    senhaCertificado: config.senhaCertificado ? "********" : null,
  };
}

export async function atualizarConfiguracao(
  tenantId: string,
  data: UpdateConfiguracaoInput
) {
  const config = await prisma.configuracao.findUnique({
    where: { tenantId },
  });

  if (!config) {
    throw new ConfiguracaoError(
      "NAO_ENCONTRADA",
      "Configuração não encontrada. Tente recarregar a página."
    );
  }

  const atualizada = await prisma.configuracao.update({
    where: { tenantId },
    data: {
      nomeEmpresa: data.nomeEmpresa,
      cnpj: data.cnpj || null,
      telefone: data.telefone || null,
      email: data.email || null,
      endereco: data.endereco || null,
      cidade: data.cidade || null,
      estado: data.estado || null,
      cep: data.cep || null,
      logoUrl: data.logoUrl || null,
      corPrimaria: data.corPrimaria,
      corSecundaria: data.corSecundaria,
      emailNotificacoes: data.emailNotificacoes,
      alertaEstoqueBaixo: data.alertaEstoqueBaixo,
      ambienteNFe: data.ambienteNFe,
      ...(data.certificadoA1 === null
        ? { certificadoA1: null, senhaCertificado: null }
        : data.certificadoA1
          ? { certificadoA1: data.certificadoA1, senhaCertificado: data.senhaCertificado || null }
          : {}),
    },
  });

  return atualizada;
}
