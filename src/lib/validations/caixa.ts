import { z } from "zod";

export const abrirCaixaSchema = z.object({
  saldoInicial: z.number().min(0, "Saldo inicial não pode ser negativo"),
});

export const fecharCaixaSchema = z.object({
  saldoReal: z.number().positive("Informe o valor em dinheiro contado"),
  observacoes: z.string().optional(),
});

export const sangriaSchema = z.object({
  valor: z.number().positive("Valor deve ser maior que zero"),
  descricao: z.string().min(1, "Informe o motivo da sangria"),
});

export const suprimentoSchema = z.object({
  valor: z.number().positive("Valor deve ser maior que zero"),
  descricao: z.string().min(1, "Informe o motivo do suprimento"),
});

export type AbrirCaixaInput = z.infer<typeof abrirCaixaSchema>;
export type FecharCaixaInput = z.infer<typeof fecharCaixaSchema>;
export type SangriaInput = z.infer<typeof sangriaSchema>;
export type SuprimentoInput = z.infer<typeof suprimentoSchema>;
