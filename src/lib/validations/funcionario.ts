import { z } from "zod";

export const createFuncionarioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (use 000.000.000-00)")
    .min(1, "CPF é obrigatório"),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cargo: z.string().optional().or(z.literal("")),
  salario: z.string().optional().or(z.literal("")),
  dataAdmissao: z.string().min(1, "Data de admissão é obrigatória"),
  dataDemissao: z.string().optional().or(z.literal("")),
  ativo: z.boolean().optional(),
});

export const updateFuncionarioSchema = createFuncionarioSchema;

export type CreateFuncionarioInput = z.infer<typeof createFuncionarioSchema>;
export type UpdateFuncionarioInput = z.infer<typeof updateFuncionarioSchema>;
