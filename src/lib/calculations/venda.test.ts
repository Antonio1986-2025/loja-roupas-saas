import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import {
  calcularSubtotal,
  calcularTotal,
  somarPagamentos,
  validarPagamentos,
  calcularTroco,
  gerarContasReceberMultiplos,
} from "./venda";

const D = (v: number | string) => new Prisma.Decimal(v);

describe("calcularSubtotal", () => {
  it("soma os subtotais dos itens", () => {
    const r = calcularSubtotal([{ subtotal: 10 }, { subtotal: 20.5 }, { subtotal: 5 }]);
    expect(r.toString()).toBe("35.5");
  });

  it("retorna 0 para lista vazia", () => {
    expect(calcularSubtotal([]).toString()).toBe("0");
  });

  it("nao perde precisao (problema classico de float 0.1+0.2)", () => {
    const r = calcularSubtotal([{ subtotal: "0.1" }, { subtotal: "0.2" }]);
    expect(r.toString()).toBe("0.3");
  });
});

describe("calcularTotal", () => {
  it("subtrai o desconto do subtotal", () => {
    expect(calcularTotal(100, 30).toString()).toBe("70");
  });

  it("sem desconto retorna o proprio subtotal", () => {
    expect(calcularTotal(100).toString()).toBe("100");
  });

  it("nunca retorna valor negativo (desconto maior que subtotal vira 0)", () => {
    expect(calcularTotal(50, 80).toString()).toBe("0");
  });

  it("mantem precisao decimal", () => {
    expect(calcularTotal("19.99", "0.99").toString()).toBe("19");
  });
});

describe("somarPagamentos", () => {
  it("soma os valores de todos os pagamentos", () => {
    const r = somarPagamentos([{ valor: 50 }, { valor: 50 }, { valor: 25.5 }]);
    expect(r.toString()).toBe("125.5");
  });

  it("retorna 0 sem pagamentos", () => {
    expect(somarPagamentos([]).toString()).toBe("0");
  });
});

describe("validarPagamentos", () => {
  it("considera suficiente quando pago == total", () => {
    const r = validarPagamentos([{ valor: 100 }], 100);
    expect(r.suficiente).toBe(true);
    expect(r.diferenca.toString()).toBe("0");
  });

  it("considera suficiente quando pago > total (com troco)", () => {
    const r = validarPagamentos([{ valor: 150 }], 100);
    expect(r.suficiente).toBe(true);
    expect(r.diferenca.toString()).toBe("50");
  });

  it("considera insuficiente quando pago < total", () => {
    const r = validarPagamentos([{ valor: 80 }], 100);
    expect(r.suficiente).toBe(false);
    expect(r.diferenca.toString()).toBe("-20");
  });

  it("soma multiplos pagamentos para validar", () => {
    const r = validarPagamentos([{ valor: 60 }, { valor: 40 }], 100);
    expect(r.suficiente).toBe(true);
  });
});

describe("calcularTroco", () => {
  it("retorna o troco quando pago excede o total", () => {
    expect(calcularTroco([{ valor: 100 }], 73).toString()).toBe("27");
  });

  it("retorna 0 quando pago == total", () => {
    expect(calcularTroco([{ valor: 100 }], 100).toString()).toBe("0");
  });

  it("retorna 0 quando pago < total (nao existe troco negativo)", () => {
    expect(calcularTroco([{ valor: 50 }], 100).toString()).toBe("0");
  });
});

describe("gerarContasReceberMultiplos", () => {
  const venda = { id: "v1", clienteId: "c1", numero: 42 };
  const tenantId = "t1";

  it("NAO gera conta a receber para DINHEIRO, PIX ou CREDITO_LOJA (pagos na hora)", () => {
    const r = gerarContasReceberMultiplos(
      [
        { formaPagamento: "DINHEIRO", valor: D(50) },
        { formaPagamento: "PIX", valor: D(30) },
        { formaPagamento: "CREDITO_LOJA", valor: D(20) },
      ],
      D(100),
      venda,
      tenantId
    );
    expect(r.length).toBe(0);
  });

  it("gera conta PAGA para DEBITO com vencimento hoje", () => {
    const r = gerarContasReceberMultiplos(
      [{ formaPagamento: "DEBITO", valor: D(100) }],
      D(100),
      venda,
      tenantId
    );
    expect(r.length).toBe(1);
    expect(r[0].status).toBe("PAGO");
    expect(r[0].formaPagamento).toBe("DEBITO");
    expect(r[0].valor.toString()).toBe("100");
  });

  it("gera conta PENDENTE para CREDITO com vencimento em 30 dias", () => {
    const hoje = new Date();
    const r = gerarContasReceberMultiplos(
      [{ formaPagamento: "CREDITO", valor: D(100) }],
      D(100),
      venda,
      tenantId
    );
    expect(r.length).toBe(1);
    expect(r[0].status).toBe("PENDENTE");
    const dias = Math.round(
      (r[0].dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(dias).toBe(30);
  });

  it("gera conta PENDENTE para BOLETO com vencimento em 3 dias", () => {
    const hoje = new Date();
    const r = gerarContasReceberMultiplos(
      [{ formaPagamento: "BOLETO", valor: D(100) }],
      D(100),
      venda,
      tenantId
    );
    expect(r.length).toBe(1);
    expect(r[0].status).toBe("PENDENTE");
    const dias = Math.round(
      (r[0].dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(dias).toBe(3);
  });

  it("pagamento misto: gera conta apenas para os metodos a prazo", () => {
    const r = gerarContasReceberMultiplos(
      [
        { formaPagamento: "DINHEIRO", valor: D(50) },
        { formaPagamento: "CREDITO", valor: D(100) },
        { formaPagamento: "BOLETO", valor: D(50) },
      ],
      D(200),
      venda,
      tenantId
    );
    expect(r.length).toBe(2);
    expect(r.map((c) => c.formaPagamento).sort()).toEqual(["BOLETO", "CREDITO"]);
  });

  it("propaga clienteId, vendaId e tenantId nas contas geradas", () => {
    const r = gerarContasReceberMultiplos(
      [{ formaPagamento: "CREDITO", valor: D(100) }],
      D(100),
      venda,
      tenantId
    );
    expect(r[0].clienteId).toBe("c1");
    expect(r[0].vendaId).toBe("v1");
    expect(r[0].tenantId).toBe("t1");
  });
});