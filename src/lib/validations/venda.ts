import { z } from "zod";

const formaPagamentoEnum = z.enum(["DINHEIRO", "DEBITO", "CREDITO", "PIX", "BOLETO"]);

export const createVendaSchema = z.object({
  clienteId: z.string().optional(),
  caixaId: z.string().optional(),
  itens: z
    .array(
      z.object({
        varianteId: z.string().min(1, "Variação é obrigatória"),
        quantidade: z.number().int().positive("Quantidade deve ser maior que zero"),
        precoUnit: z.number().positive("Preço deve ser maior que zero"),
        subtotal: z.number().positive(),
      })
    )
    .min(1, "Adicione ao menos um item"),
  formaPagamento: formaPagamentoEnum,
  pagamentos: z
    .array(
      z.object({
        formaPagamento: formaPagamentoEnum,
        valor: z.number().positive("Valor do pagamento deve ser maior que zero"),
      })
    )
    .optional(),
  desconto: z.number().min(0).default(0),
  observacoes: z.string().optional(),
});

export type CreateVendaInput = z.infer<typeof createVendaSchema>;
export type PagamentoInput = { formaPagamento: "DINHEIRO" | "DEBITO" | "CREDITO" | "PIX" | "BOLETO"; valor: number };

export const devolucaoSchema = z.object({
  itens: z
    .array(
      z.object({
        vendaItemId: z.string().min(1, "Item é obrigatório"),
        quantidade: z.number().int().positive("Quantidade deve ser maior que zero"),
      })
    )
    .min(1, "Selecione ao menos um item para devolver"),
  tipoEstorno: z.enum(["DINHEIRO", "CREDITO_LOJA"], {
    errorMap: () => ({ message: "Selecione o tipo de estorno" }),
  }),
  motivo: z.string().optional(),
});

export type DevolucaoInput = z.infer<typeof devolucaoSchema>;