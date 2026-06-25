import { z } from "zod";

export const createVendaCondicionalSchema = z.object({
  clienteId: z.string().min(1, "Cliente é obrigatório"),
  prazoDias: z
    .number()
    .int("Prazo deve ser um número inteiro")
    .min(1, "Prazo mínimo é 1 dia")
    .max(30, "Prazo máximo é 30 dias"),
  observacoes: z.string().optional(),
  itens: z
    .array(
      z.object({
        varianteId: z.string().min(1, "Variante é obrigatória"),
        quantidade: z.number().int().positive("Quantidade deve ser maior que zero"),
      })
    )
    .min(1, "Adicione ao menos um item"),
});

export const finalizarVendaCondicionalSchema = z.object({
  itens: z
    .array(
      z.object({
        itemId: z.string().min(1),
        status: z.enum(["COMPRADO", "DEVOLVIDO"]),
      })
    )
    .min(1, "Classifique ao menos um item"),
  formaPagamento: z
    .enum(["DINHEIRO", "DEBITO", "CREDITO", "PIX", "BOLETO"])
    .optional(),
});

export type CreateVendaCondicionalInput = z.infer<typeof createVendaCondicionalSchema>;
export type FinalizarVendaCondicionalInput = z.infer<typeof finalizarVendaCondicionalSchema>;
