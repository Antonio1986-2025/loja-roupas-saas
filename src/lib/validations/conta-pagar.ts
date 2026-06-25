import { z } from "zod";

export const createContaPagarSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").max(200, "Máximo 200 caracteres"),
  valor: z.string().min(1, "Valor é obrigatório"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  dataPagamento: z.string().optional().or(z.literal("")),
  status: z.string().optional(),
  categoria: z.string().optional(),
  fornecedorId: z.string().optional().or(z.literal("")),
  observacoes: z.string().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});

export const updateContaPagarSchema = createContaPagarSchema;

export type CreateContaPagarInput = z.infer<typeof createContaPagarSchema>;
export type UpdateContaPagarInput = z.infer<typeof updateContaPagarSchema>;
