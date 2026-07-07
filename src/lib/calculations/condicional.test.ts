import { describe, it, expect } from "vitest";
import {
  calcularDataVencimento,
  calcularSubtotalItem,
  temEstoqueDisponivel,
  contarClassificacao,
  estaVencida,
} from "./condicional";

describe("calcularDataVencimento", () => {
  it("soma o prazo em dias a partir da data de saida", () => {
    const saida = new Date("2026-01-10T00:00:00");
    const venc = calcularDataVencimento(saida, 5);
    expect(venc.getFullYear()).toBe(2026);
    expect(venc.getMonth()).toBe(0); // janeiro
    expect(venc.getDate()).toBe(15);
  });

  it("atravessa a virada de mes corretamente", () => {
    const saida = new Date("2026-01-30T00:00:00");
    const venc = calcularDataVencimento(saida, 5);
    expect(venc.getMonth()).toBe(1); // fevereiro
    expect(venc.getDate()).toBe(4);
  });

  it("nao altera a data de saida original (sem efeito colateral)", () => {
    const saida = new Date("2026-01-10T00:00:00");
    calcularDataVencimento(saida, 7);
    expect(saida.getDate()).toBe(10);
  });
});

describe("calcularSubtotalItem", () => {
  it("multiplica preco por quantidade", () => {
    expect(calcularSubtotalItem(10, 3).toString()).toBe("30");
  });

  it("mantem precisao decimal (sem erro de float)", () => {
    expect(calcularSubtotalItem("0.1", 3).toString()).toBe("0.3");
  });

  it("aceita preco como string", () => {
    expect(calcularSubtotalItem("19.90", 2).toString()).toBe("39.8");
  });
});

describe("temEstoqueDisponivel", () => {
  it("aprova quando o disponivel e maior ou igual ao pedido", () => {
    expect(temEstoqueDisponivel(10, 5)).toBe(true);
    expect(temEstoqueDisponivel(5, 5)).toBe(true);
  });

  it("reprova quando o disponivel e menor que o pedido", () => {
    expect(temEstoqueDisponivel(3, 5)).toBe(false);
  });

  it("reprova pedido quando nao ha estoque", () => {
    expect(temEstoqueDisponivel(0, 1)).toBe(false);
  });
});

describe("contarClassificacao", () => {
  it("conta comprados e devolvidos", () => {
    const r = contarClassificacao([
      { status: "COMPRADO" },
      { status: "DEVOLVIDO" },
      { status: "COMPRADO" },
    ]);
    expect(r.comprados).toBe(2);
    expect(r.devolvidos).toBe(1);
  });

  it("retorna zero para lista vazia", () => {
    expect(contarClassificacao([])).toEqual({ comprados: 0, devolvidos: 0 });
  });

  it("conta todos devolvidos", () => {
    const r = contarClassificacao([{ status: "DEVOLVIDO" }, { status: "DEVOLVIDO" }]);
    expect(r.comprados).toBe(0);
    expect(r.devolvidos).toBe(2);
  });
});

describe("estaVencida", () => {
  const hoje = new Date("2026-06-25T12:00:00");

  it("considera vencida uma condicional ATIVA com vencimento no passado", () => {
    const venc = new Date("2026-06-20T00:00:00");
    expect(estaVencida("ATIVA", venc, hoje)).toBe(true);
  });

  it("nao considera vencida se o vencimento e no futuro", () => {
    const venc = new Date("2026-06-30T00:00:00");
    expect(estaVencida("ATIVA", venc, hoje)).toBe(false);
  });

  it("nao considera vencida se ja foi finalizada/cancelada", () => {
    const venc = new Date("2026-06-20T00:00:00");
    expect(estaVencida("FINALIZADA", venc, hoje)).toBe(false);
    expect(estaVencida("CANCELADA", venc, hoje)).toBe(false);
  });
});