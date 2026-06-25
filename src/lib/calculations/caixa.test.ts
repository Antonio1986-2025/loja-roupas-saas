import { describe, it, expect } from "vitest";
import {
  totalizarPagamentosPorForma,
  totalizarMovimentos,
  calcularSaldoCaixa,
  calcularDiferencaCaixa,
} from "./caixa";

describe("totalizarPagamentosPorForma", () => {
  it("agrupa e soma os valores por forma de pagamento", () => {
    const r = totalizarPagamentosPorForma([
      { formaPagamento: "DINHEIRO", valor: 50 },
      { formaPagamento: "DINHEIRO", valor: 30 },
      { formaPagamento: "PIX", valor: 20 },
      { formaPagamento: "DEBITO", valor: 15 },
      { formaPagamento: "CREDITO", valor: 10 },
      { formaPagamento: "CREDITO_LOJA", valor: 5 },
      { formaPagamento: "BOLETO", valor: 100 },
    ]);
    expect(r.dinheiro).toBe(80);
    expect(r.pix).toBe(20);
    expect(r.debito).toBe(15);
    expect(r.credito).toBe(10);
    expect(r.creditoLoja).toBe(5);
    expect(r.boleto).toBe(100);
  });

  it("retorna tudo zero para lista vazia", () => {
    const r = totalizarPagamentosPorForma([]);
    expect(r).toEqual({ dinheiro: 0, pix: 0, debito: 0, credito: 0, creditoLoja: 0, boleto: 0 });
  });

  it("ignora formas de pagamento desconhecidas", () => {
    const r = totalizarPagamentosPorForma([
      { formaPagamento: "DINHEIRO", valor: 10 },
      { formaPagamento: "DESCONHECIDA", valor: 999 },
    ]);
    expect(r.dinheiro).toBe(10);
  });

  it("aceita valores como string (vindos de Decimal)", () => {
    const r = totalizarPagamentosPorForma([
      { formaPagamento: "DINHEIRO", valor: "12.50" },
      { formaPagamento: "DINHEIRO", valor: "7.50" },
    ]);
    expect(r.dinheiro).toBe(20);
  });
});

describe("totalizarMovimentos", () => {
  it("soma suprimentos e sangrias separadamente", () => {
    const r = totalizarMovimentos([
      { tipo: "SUPRIMENTO", valor: 100 },
      { tipo: "SANGRIA", valor: 40 },
      { tipo: "SUPRIMENTO", valor: 50 },
    ]);
    expect(r.suprimentos).toBe(150);
    expect(r.sangrias).toBe(40);
  });

  it("ignora outros tipos de movimento (ex: ABERTURA)", () => {
    const r = totalizarMovimentos([
      { tipo: "ABERTURA", valor: 200 },
      { tipo: "SANGRIA", valor: 30 },
    ]);
    expect(r.suprimentos).toBe(0);
    expect(r.sangrias).toBe(30);
  });

  it("retorna zero para lista vazia", () => {
    expect(totalizarMovimentos([])).toEqual({ suprimentos: 0, sangrias: 0 });
  });
});

describe("calcularSaldoCaixa", () => {
  it("soma saldo inicial, dinheiro e suprimentos, subtrai sangrias", () => {
    // 100 + 500 + 50 - 80 = 570
    expect(calcularSaldoCaixa(100, 500, 50, 80)).toBe(570);
  });

  it("funciona sem movimentacoes extras", () => {
    expect(calcularSaldoCaixa(100, 0, 0, 0)).toBe(100);
  });

  it("pode resultar em saldo menor que o inicial com muitas sangrias", () => {
    expect(calcularSaldoCaixa(100, 0, 0, 30)).toBe(70);
  });
});

describe("calcularDiferencaCaixa", () => {
  it("retorna sobra (positivo) quando o contado e maior que o esperado", () => {
    expect(calcularDiferencaCaixa(520, 500)).toBe(20);
  });

  it("retorna falta (negativo) quando o contado e menor que o esperado", () => {
    expect(calcularDiferencaCaixa(480, 500)).toBe(-20);
  });

  it("retorna zero quando bate exatamente", () => {
    expect(calcularDiferencaCaixa(500, 500)).toBe(0);
  });
});