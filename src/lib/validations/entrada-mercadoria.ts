import { z } from "zod";

const parcelaSchema = z.object({
  valor: z.number().min(0),
  vencimento: z.string(),
});

export const createEntradaMercadoriaSchema = z.object({
  fornecedorId: z.string().optional(),
  chaveAcesso: z.string().optional(),
  numeroNFe: z.string().optional(),
  serieNFe: z.number().int().optional(),
  dataEmissao: z.string().optional(),
  cfop: z.string().optional(),
  naturezaOperacao: z.string().optional(),
  dataEntrada: z.string().optional(),
  valorFrete: z.number().min(0).optional(),
  valorSeguro: z.number().min(0).optional(),
  valorDespesas: z.number().min(0).optional(),
  valorDesconto: z.number().min(0).optional(),
  valorICMS: z.number().min(0).optional(),
  valorPIS: z.number().min(0).optional(),
  valorCOFINS: z.number().min(0).optional(),
  valorIPI: z.number().min(0).optional(),
  xmlOriginal: z.string().optional(),
  margemLucroPadrao: z.number().min(0).max(100).optional(),
  gerarContasPagar: z.boolean().optional(),
  observacao: z.string().optional(),
  valorTotal: z.number().min(0).optional(),
  parcelas: z.array(parcelaSchema).optional(),
  itens: z
    .array(
      z.object({
        varianteId: z.string().min(1, "Selecione um produto"),
        quantidade: z.number().int().min(1, "Quantidade deve ser maior que zero"),
        precoUnitario: z.number().min(0),
        precoCusto: z.number().optional(),
        custoFrete: z.number().optional(),
        custoDespesas: z.number().optional(),
        custoFinal: z.number().optional(),
        margemLucro: z.number().min(0).max(100).optional(),
        precoVendaSugerido: z.number().min(0).optional(),
        valorICMS: z.number().optional(),
        valorPIS: z.number().optional(),
        valorCOFINS: z.number().optional(),
      })
    )
    .min(1, "Adicione ao menos um produto"),
});

export type CreateEntradaMercadoriaInput = z.infer<typeof createEntradaMercadoriaSchema>;
