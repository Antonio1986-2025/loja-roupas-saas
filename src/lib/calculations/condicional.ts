import { Prisma } from "@prisma/client";

/**
 * Calculos puros de venda condicional / consignacao (sem acesso ao banco).
 */

/** Calcula a data de vencimento somando o prazo (em dias) a partir da data de saida. */
export function calcularDataVencimento(dataSaida: Date, prazoDias: number): Date {
  const vencimento = new Date(dataSaida);
  vencimento.setDate(vencimento.getDate() + prazoDias);
  return vencimento;
}

/** Subtotal de um item: preco unitario x quantidade (com precisao decimal). */
export function calcularSubtotalItem(
  preco: Prisma.Decimal | number | string,
  quantidade: number
): Prisma.Decimal {
  return new Prisma.Decimal(preco).mul(quantidade);
}

/** Verifica se ha estoque disponivel suficiente para reservar a quantidade pedida. */
export function temEstoqueDisponivel(qtdDisponivel: number, quantidade: number): boolean {
  return qtdDisponivel >= quantidade;
}

export type StatusFinalItem = "COMPRADO" | "DEVOLVIDO";

/** Conta quantos itens foram comprados e quantos devolvidos numa finalizacao. */
export function contarClassificacao(
  itens: { status: StatusFinalItem }[]
): { comprados: number; devolvidos: number } {
  let comprados = 0;
  let devolvidos = 0;
  for (const item of itens) {
    if (item.status === "COMPRADO") comprados++;
    else if (item.status === "DEVOLVIDO") devolvidos++;
  }
  return { comprados, devolvidos };
}

/**
 * Verifica se uma condicional esta vencida.
 * Vencida = ativa e com data de vencimento no passado.
 */
export function estaVencida(
  status: string,
  dataVencimento: Date,
  referencia: Date = new Date()
): boolean {
  return status === "ATIVA" && dataVencimento.getTime() < referencia.getTime();
}