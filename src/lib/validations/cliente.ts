import { z } from "zod";

export const createClienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  cpf: z
    .string()
    .min(1, "CPF é obrigatório")
    .regex(/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/, "CPF inválido (use 01646407113 ou 016.464.071-13)"),
  telefone: z.string().min(1, "Telefone é obrigatório").max(20, "Telefone muito longo"),
  email: z.string().email("Email inválido").max(200, "Email muito longo").optional().or(z.literal("")),
  dataNascimento: z.string().optional().or(z.literal("")),
  endereco: z.string().max(300, "Endereço muito longo").optional().or(z.literal("")),
  cidade: z.string().max(100, "Cidade muito longa").optional().or(z.literal("")),
  estado: z.string().max(50, "Estado muito longo").optional().or(z.literal("")),
  cep: z.string().max(10, "CEP inválido").optional().or(z.literal("")),
  observacoes: z.string().max(500, "Observações muito longas").optional().or(z.literal("")),
});

export const updateClienteSchema = createClienteSchema;

export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
