import { z } from "zod";

export const createContaReceberSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").max(200, "Máximo 200 caracteres"),
  valor: z.string().min(1, "Valor é obrigatório"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  dataRecebimento: z.string().optional().or(z.literal("")),
  status: z.string().optional(),
  categoria: z.string().optional(),
  formaPagamento: z.string().optional().or(z.literal("")),
  clienteId: z.string().optional().or(z.literal("")),
  vendaId: z.string().optional().or(z.literal("")),
  observacoes: z.string().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});

export const updateContaReceberSchema = createContaReceberSchema;

export type CreateContaReceberInput = z.infer<typeof createContaReceberSchema>;
export type UpdateContaReceberInput = z.infer<typeof updateContaReceberSchema>;
