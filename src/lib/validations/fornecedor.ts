import { z } from "zod";

export const createFornecedorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(200, "Máximo 200 caracteres"),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (use 00.000.000/0000-00)")
    .max(18, "Máximo 18 caracteres")
    .optional()
    .or(z.literal("")),
  telefone: z.string().max(20, "Máximo 20 caracteres").optional().or(z.literal("")),
  email: z.string().email("Email inválido").max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
  endereco: z.string().max(300, "Máximo 300 caracteres").optional().or(z.literal("")),
  cidade: z.string().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  estado: z.string().max(50, "Máximo 50 caracteres").optional().or(z.literal("")),
  cep: z.string().max(10, "Máximo 10 caracteres").optional().or(z.literal("")),
  observacoes: z.string().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});

export const updateFornecedorSchema = createFornecedorSchema;

export type CreateFornecedorInput = z.infer<typeof createFornecedorSchema>;
export type UpdateFornecedorInput = z.infer<typeof updateFornecedorSchema>;
