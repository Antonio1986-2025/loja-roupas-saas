import { z } from "zod";

const formaPagamentoEnum = z.enum([
  "DINHEIRO",
  "DEBITO",
  "CREDITO",
  "PIX",
  "BOLETO",
  "CREDITO_LOJA",
  "DUPLICATA",
]);

export const createOrcamentoSchema = z.object({
  clienteId: z.string().optional(),
  itens: z
    .array(
      z.object({
        varianteId: z.string().min(1, "Variação é obrigatória"),
        quantidade: z.number().int().positive("Quantidade deve ser maior que zero"),
        precoUnit: z.number().positive("Preço deve ser maior que zero"),
        desconto: z.number().min(0).default(0),
        subtotal: z.number().positive(),
      })
    )
    .min(1, "Adicione ao menos um item"),
  validadeDias: z.number().int().min(1).max(365).default(7),
  formaPagamento: formaPagamentoEnum.optional(),
  desconto: z.number().min(0).default(0),
  observacoes: z.string().optional(),
});

export const updateOrcamentoSchema = z.object({
  clienteId: z.string().optional().nullable(),
  itens: z
    .array(
      z.object({
        varianteId: z.string().min(1),
        quantidade: z.number().int().positive(),
        precoUnit: z.number().positive(),
        desconto: z.number().min(0).default(0),
        subtotal: z.number().positive(),
      })
    )
    .min(1)
    .optional(),
  validadeDias: z.number().int().min(1).max(365).optional(),
  formaPagamento: formaPagamentoEnum.optional().nullable(),
  desconto: z.number().min(0).optional(),
  observacoes: z.string().optional().nullable(),
});

export type CreateOrcamentoInput = z.infer<typeof createOrcamentoSchema>;
export type UpdateOrcamentoInput = z.infer<typeof updateOrcamentoSchema>;
