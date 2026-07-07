/**
 * Calculos puros de caixa (sem acesso ao banco de dados).
 * Centralizados aqui para serem testaveis e reutilizaveis.
 */

type ValorNumerico = number | string | { toString(): string };

const num = (v: ValorNumerico): number => Number(v);

export type TotaisPorForma = {
  dinheiro: number;
  pix: number;
  debito: number;
  credito: number;
  creditoLoja: number;
  boleto: number;
};

/** Soma os valores dos pagamentos agrupados por forma de pagamento. */
export function totalizarPagamentosPorForma(
  pagamentos: { formaPagamento: string; valor: ValorNumerico }[]
): TotaisPorForma {
  const totais: TotaisPorForma = {
    dinheiro: 0,
    pix: 0,
    debito: 0,
    credito: 0,
    creditoLoja: 0,
    boleto: 0,
  };

  for (const pag of pagamentos) {
    const valor = num(pag.valor);
    switch (pag.formaPagamento) {
      case "DINHEIRO": totais.dinheiro += valor; break;
      case "PIX": totais.pix += valor; break;
      case "DEBITO": totais.debito += valor; break;
      case "CREDITO": totais.credito += valor; break;
      case "CREDITO_LOJA": totais.creditoLoja += valor; break;
      case "BOLETO": totais.boleto += valor; break;
    }
  }

  return totais;
}

/** Soma suprimentos e sangrias a partir dos movimentos de caixa. */
export function totalizarMovimentos(
  movimentos: { tipo: string; valor: ValorNumerico }[]
): { suprimentos: number; sangrias: number } {
  let suprimentos = 0;
  let sangrias = 0;
  for (const mov of movimentos) {
    if (mov.tipo === "SUPRIMENTO") suprimentos += num(mov.valor);
    if (mov.tipo === "SANGRIA") sangrias += num(mov.valor);
  }
  return { suprimentos, sangrias };
}

/**
 * Calcula o saldo de dinheiro em caixa.
 * saldoInicial + vendas em dinheiro + suprimentos - sangrias.
 */
export function calcularSaldoCaixa(
  saldoInicial: ValorNumerico,
  totalDinheiro: ValorNumerico,
  totalSuprimentos: ValorNumerico,
  totalSangrias: ValorNumerico
): number {
  return num(saldoInicial) + num(totalDinheiro) + num(totalSuprimentos) - num(totalSangrias);
}

/**
 * Diferenca no fechamento: valor contado (real) menos o saldo esperado (sistema).
 * Positivo = sobra; negativo = falta.
 */
export function calcularDiferencaCaixa(
  saldoReal: ValorNumerico,
  saldoEsperado: ValorNumerico
): number {
  return num(saldoReal) - num(saldoEsperado);
}