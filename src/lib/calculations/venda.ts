import { Prisma } from "@prisma/client";
import type { FormaPagamento } from "@prisma/client";

/**
 * Calculos puros de venda (sem acesso ao banco de dados).
 * Centralizados aqui para serem testaveis e reutilizaveis.
 */

/** Soma os subtotais dos itens para obter o subtotal da venda. */
export function calcularSubtotal(
  itens: { subtotal: Prisma.Decimal | number | string }[]
): Prisma.Decimal {
  return itens.reduce(
    (acc, item) => acc.add(new Prisma.Decimal(item.subtotal)),
    new Prisma.Decimal(0)
  );
}

/** Calcula o total da venda: subtotal - desconto (nunca abaixo de zero). */
export function calcularTotal(
  subtotal: Prisma.Decimal | number | string,
  desconto: Prisma.Decimal | number | string = 0
): Prisma.Decimal {
  const sub = new Prisma.Decimal(subtotal);
  const desc = new Prisma.Decimal(desconto);
  const total = sub.sub(desc);
  return total.lt(0) ? new Prisma.Decimal(0) : total;
}

/** Soma o valor de todos os pagamentos. */
export function somarPagamentos(
  pagamentos: { valor: Prisma.Decimal | number | string }[]
): Prisma.Decimal {
  return pagamentos.reduce(
    (acc, p) => acc.add(new Prisma.Decimal(p.valor)),
    new Prisma.Decimal(0)
  );
}

/**
 * Verifica se os pagamentos cobrem o total da venda.
 * Retorna o status e a diferenca (pago - total): negativa = falta, positiva = troco.
 */
export function validarPagamentos(
  pagamentos: { valor: Prisma.Decimal | number | string }[],
  total: Prisma.Decimal | number | string
): { suficiente: boolean; diferenca: Prisma.Decimal } {
  const pago = somarPagamentos(pagamentos);
  const tot = new Prisma.Decimal(total);
  const diferenca = pago.sub(tot);
  return { suficiente: diferenca.gte(0), diferenca };
}

/** Calcula o troco (diferenca positiva entre pago e total; zero se nao houver). */
export function calcularTroco(
  pagamentos: { valor: Prisma.Decimal | number | string }[],
  total: Prisma.Decimal | number | string
): Prisma.Decimal {
  const { diferenca } = validarPagamentos(pagamentos, total);
  return diferenca.gt(0) ? diferenca : new Prisma.Decimal(0);
}

export function gerarContasReceberMultiplos(
  pagamentos: { formaPagamento: FormaPagamento; valor: Prisma.Decimal }[],
  _total: Prisma.Decimal,
  venda: { id: string; clienteId: string | null; numero: number; qtdParcelas?: number | null },
  tenantId: string
) {
  const hoje = new Date();
  const resultado: {
    descricao: string;
    valor: Prisma.Decimal;
    dataVencimento: Date;
    dataRecebimento?: Date;
    status: "PENDENTE" | "PAGO";
    categoria: "VENDA";
    formaPagamento: FormaPagamento;
    clienteId: string | null;
    vendaId: string;
    observacoes: string;
    tenantId: string;
  }[] = [];

  for (const pag of pagamentos) {
    if (pag.formaPagamento === "DINHEIRO" || pag.formaPagamento === "PIX" || pag.formaPagamento === "CREDITO_LOJA") continue;

    if (pag.formaPagamento === "DEBITO") {
      resultado.push({
        descricao: `Venda #${venda.numero} - Débito`,
        valor: pag.valor,
        dataVencimento: hoje,
        dataRecebimento: hoje,
        status: "PAGO",
        categoria: "VENDA",
        formaPagamento: "DEBITO",
        clienteId: venda.clienteId,
        vendaId: venda.id,
        observacoes: `Venda #${venda.numero} - Débito`,
        tenantId,
      });
      continue;
    }

    if (pag.formaPagamento === "CREDITO") {
      const vencimento = new Date(hoje);
      vencimento.setDate(vencimento.getDate() + 30);
      resultado.push({
        descricao: `Venda #${venda.numero} - Crédito`,
        valor: pag.valor,
        dataVencimento: vencimento,
        status: "PENDENTE",
        categoria: "VENDA",
        formaPagamento: "CREDITO",
        clienteId: venda.clienteId,
        vendaId: venda.id,
        observacoes: `Venda #${venda.numero} - Crédito 30 dias`,
        tenantId,
      });
      continue;
    }

    if (pag.formaPagamento === "BOLETO") {
      const vencimento = new Date(hoje);
      vencimento.setDate(vencimento.getDate() + 3);
      resultado.push({
        descricao: `Venda #${venda.numero} - Boleto`,
        valor: pag.valor,
        dataVencimento: vencimento,
        status: "PENDENTE",
        categoria: "VENDA",
        formaPagamento: "BOLETO",
        clienteId: venda.clienteId,
        vendaId: venda.id,
        observacoes: `Venda #${venda.numero} - Boleto 3 dias`,
        tenantId,
      });
    }

    if (pag.formaPagamento === "DUPLICATA") {
      const numParcelas = venda.qtdParcelas || 1;
      const valorParcela = pag.valor.div(numParcelas).toDecimalPlaces(2);
      let somaParcelas = new Prisma.Decimal(0);
      for (let i = 1; i <= numParcelas; i++) {
        const vencimento = new Date(hoje);
        vencimento.setDate(vencimento.getDate() + 30 * i);
        const valorFinal = i === numParcelas ? pag.valor.sub(somaParcelas) : valorParcela;
        somaParcelas = somaParcelas.add(valorFinal);
        resultado.push({
          descricao: `Venda #${venda.numero} - Duplicata ${i}/${numParcelas}`,
          valor: valorFinal,
          dataVencimento: vencimento,
          status: "PENDENTE",
          categoria: "VENDA",
          formaPagamento: "DUPLICATA",
          clienteId: venda.clienteId,
          vendaId: venda.id,
          observacoes: `Venda #${venda.numero} - Duplicata ${i}/${numParcelas} - ${numParcelas}x`,
          tenantId,
        });
      }
    }
  }

  return resultado;
}
