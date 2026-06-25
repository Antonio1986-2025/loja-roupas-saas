import { describe, it, expect } from "vitest";
import {
  calcularSituacaoEstoque,
  calcularAjusteEstoque,
  validarAjusteEstoque,
  calcularValorEstoque,
  calcularTotalUnidades,
} from "./estoque";

describe("calcularSituacaoEstoque", () => {
  it("retorna 'zerado' quando a quantidade e 0", () => {
    expect(calcularSituacaoEstoque(0, 5)).toBe("zerado");
    expect(calcularSituacaoEstoque(0, 0)).toBe("zerado");
  });

  it("retorna 'baixo' quando a quantidade e menor ou igual ao minimo", () => {
    expect(calcularSituacaoEstoque(3, 5)).toBe("baixo");
    expect(calcularSituacaoEstoque(5, 5)).toBe("baixo");
  });

  it("retorna 'normal' entre o minimo e o limite de excesso", () => {
    expect(calcularSituacaoEstoque(10, 5)).toBe("normal");
    expect(calcularSituacaoEstoque(50, 5)).toBe("normal");
  });

  it("retorna 'excesso' acima do limite (padrao 50)", () => {
    expect(calcularSituacaoEstoque(51, 5)).toBe("excesso");
    expect(calcularSituacaoEstoque(100, 5)).toBe("excesso");
  });

  it("prioriza 'baixo' sobre 'excesso' quando minimo e alto", () => {
    // qtd 55 <= minimo 60 => baixo, mesmo sendo > 50
    expect(calcularSituacaoEstoque(55, 60)).toBe("baixo");
  });

  it("respeita limite de excesso customizado", () => {
    expect(calcularSituacaoEstoque(11, 2, 10)).toBe("excesso");
    expect(calcularSituacaoEstoque(10, 2, 10)).toBe("normal");
  });
});

describe("calcularAjusteEstoque", () => {
  it("calcula diferenca positiva (entrada) e ajusta disponivel", () => {
    const r = calcularAjusteEstoque(10, 8, 15);
    expect(r.diferenca).toBe(5);
    expect(r.qtdDisponivelNova).toBe(13); // 8 + 5
  });

  it("calcula diferenca negativa (reducao) e ajusta disponivel", () => {
    const r = calcularAjusteEstoque(10, 8, 6);
    expect(r.diferenca).toBe(-4);
    expect(r.qtdDisponivelNova).toBe(4); // 8 - 4
  });

  it("nunca deixa o disponivel negativo", () => {
    const r = calcularAjusteEstoque(10, 2, 0);
    expect(r.diferenca).toBe(-10);
    expect(r.qtdDisponivelNova).toBe(0); // max(0, 2-10)
  });

  it("diferenca zero quando a quantidade nao muda", () => {
    const r = calcularAjusteEstoque(10, 8, 10);
    expect(r.diferenca).toBe(0);
    expect(r.qtdDisponivelNova).toBe(8);
  });
});

describe("validarAjusteEstoque", () => {
  it("aceita ajuste valido", () => {
    expect(validarAjusteEstoque({ quantidade: 10, motivo: "Contagem" })).toBeNull();
  });

  it("rejeita quantidade negativa", () => {
    const r = validarAjusteEstoque({ quantidade: -1, motivo: "x" });
    expect(r?.codigo).toBe("QUANTIDADE_INVALIDA");
  });

  it("rejeita quantidade nao inteira", () => {
    const r = validarAjusteEstoque({ quantidade: 2.5, motivo: "x" });
    expect(r?.codigo).toBe("QUANTIDADE_INVALIDA");
  });

  it("rejeita motivo vazio ou so espacos", () => {
    expect(validarAjusteEstoque({ quantidade: 5, motivo: "" })?.codigo).toBe("MOTIVO_OBRIGATORIO");
    expect(validarAjusteEstoque({ quantidade: 5, motivo: "   " })?.codigo).toBe("MOTIVO_OBRIGATORIO");
    expect(validarAjusteEstoque({ quantidade: 5 })?.codigo).toBe("MOTIVO_OBRIGATORIO");
  });
});

describe("calcularValorEstoque", () => {
  it("soma preco x quantidade de todas as variantes", () => {
    const r = calcularValorEstoque([
      { qtdEstoque: 2, precoVenda: 10 },
      { qtdEstoque: 3, precoVenda: 5 },
    ]);
    expect(r).toBe(35); // 20 + 15
  });

  it("retorna 0 para lista vazia", () => {
    expect(calcularValorEstoque([])).toBe(0);
  });

  it("ignora valor de itens zerados", () => {
    const r = calcularValorEstoque([
      { qtdEstoque: 0, precoVenda: 100 },
      { qtdEstoque: 1, precoVenda: 50 },
    ]);
    expect(r).toBe(50);
  });
});

describe("calcularTotalUnidades", () => {
  it("soma as quantidades de todas as variantes", () => {
    expect(calcularTotalUnidades([{ qtdEstoque: 5 }, { qtdEstoque: 10 }, { qtdEstoque: 0 }])).toBe(15);
  });

  it("retorna 0 para lista vazia", () => {
    expect(calcularTotalUnidades([])).toBe(0);
  });
});