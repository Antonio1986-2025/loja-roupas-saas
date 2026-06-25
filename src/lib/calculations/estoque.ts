/**
 * Calculos puros de estoque (sem acesso ao banco de dados).
 * Centralizados aqui para serem testaveis e reutilizaveis.
 */

export type SituacaoEstoque = "zerado" | "baixo" | "excesso" | "normal";

/**
 * Determina a situacao de uma variante com base na quantidade e no minimo.
 * Ordem de prioridade: zerado > baixo > excesso > normal.
 */
export function calcularSituacaoEstoque(
  qtdEstoque: number,
  estoqueMinimo: number,
  limiteExcesso = 50
): SituacaoEstoque {
  if (qtdEstoque === 0) return "zerado";
  if (qtdEstoque <= estoqueMinimo) return "baixo";
  if (qtdEstoque > limiteExcesso) return "excesso";
  return "normal";
}

/**
 * Calcula o resultado de um ajuste de estoque para uma nova quantidade absoluta.
 * - diferenca: quanto mudou (positivo = entrada, negativo = saida)
 * - qtdDisponivelNova: disponivel ajustado pela diferenca, nunca abaixo de zero
 */
export function calcularAjusteEstoque(
  qtdAtual: number,
  qtdDisponivelAtual: number,
  novaQuantidade: number
): { diferenca: number; qtdDisponivelNova: number } {
  const diferenca = novaQuantidade - qtdAtual;
  const qtdDisponivelNova = Math.max(0, qtdDisponivelAtual + diferenca);
  return { diferenca, qtdDisponivelNova };
}

/** Valida os dados de um ajuste de estoque. Retorna o primeiro erro encontrado, ou null. */
export function validarAjusteEstoque(dados: {
  quantidade: number;
  motivo?: string;
}): { codigo: string; mensagem: string } | null {
  if (dados.quantidade < 0) {
    return { codigo: "QUANTIDADE_INVALIDA", mensagem: "Quantidade não pode ser negativa" };
  }
  if (!Number.isInteger(dados.quantidade)) {
    return { codigo: "QUANTIDADE_INVALIDA", mensagem: "Quantidade deve ser um número inteiro" };
  }
  if (!dados.motivo?.trim()) {
    return { codigo: "MOTIVO_OBRIGATORIO", mensagem: "Motivo é obrigatório" };
  }
  return null;
}

/** Calcula o valor total em estoque (preco x quantidade) de uma lista de variantes. */
export function calcularValorEstoque(
  variantes: { qtdEstoque: number; precoVenda: number }[]
): number {
  return variantes.reduce((soma, v) => soma + v.precoVenda * v.qtdEstoque, 0);
}

/** Soma o total de unidades em estoque. */
export function calcularTotalUnidades(
  variantes: { qtdEstoque: number }[]
): number {
  return variantes.reduce((soma, v) => soma + v.qtdEstoque, 0);
}