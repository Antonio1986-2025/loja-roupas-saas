import { z } from "zod";

export const updateConfiguracaoSchema = z.object({
  certificadoA1: z.string().optional().nullable(),
  senhaCertificado: z.string().optional().nullable(),
  nomeEmpresa: z.string().min(1, "Nome da empresa é obrigatório"),
  cnpj: z.string().optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  estado: z.string().optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  corPrimaria: z.string().optional(),
  corSecundaria: z.string().optional(),
  emailNotificacoes: z.boolean().optional(),
  alertaEstoqueBaixo: z.boolean().optional(),
});

export type UpdateConfiguracaoInput = z.infer<typeof updateConfiguracaoSchema>;
