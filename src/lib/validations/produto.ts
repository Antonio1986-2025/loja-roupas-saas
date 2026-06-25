import { z } from "zod";

export const varianteSchema = z.object({
  id: z.string().optional(),
  cor: z.string().optional().or(z.literal("")),
  tamanho: z.string().optional().or(z.literal("")),
  codigoBarras: z.string().min(1, "Código de barras é obrigatório"),
  codigoInterno: z.string().optional().or(z.literal("")),
  codigoFornecedor: z.string().optional().or(z.literal("")),
  precoVenda: z.string().optional().or(z.literal("")),
  estoqueMinimo: z.string().optional().or(z.literal("")),
  qtdEstoque: z.string().optional().or(z.literal("")),
});

export const createProdutoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().or(z.literal("")),
  codigoInterno: z.string().optional().or(z.literal("")),
  codigoFornecedor: z.string().optional().or(z.literal("")),
  marca: z.string().optional().or(z.literal("")),
  genero: z.string().optional().or(z.literal("")),
  precoVenda: z.string().min(1, "Preço de venda é obrigatório"),
  precoCusto: z.string().optional().or(z.literal("")),
  fotoUrl: z.string().optional().or(z.literal("")),
  ativo: z.boolean().optional(),
  categoriaId: z.string().optional().or(z.literal("")),
  fornecedorId: z.string().optional().or(z.literal("")),
  variantes: z.array(varianteSchema).min(1, "Adicione pelo menos uma variação"),
});

export const updateProdutoSchema = createProdutoSchema;

export type CreateProdutoInput = z.infer<typeof createProdutoSchema>;
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>;
export type VarianteInput = z.infer<typeof varianteSchema>;
