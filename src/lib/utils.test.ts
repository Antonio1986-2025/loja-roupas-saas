import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  generateSlug,
  generateSKU,
} from "./utils";

describe("formatCurrency", () => {
  it("formata valores em reais (BRL)", () => {
    // \u00A0 e o espaco nao-quebravel que o Intl usa entre R$ e o numero
    expect(formatCurrency(10).replace(/\u00A0/g, " ")).toBe("R$ 10,00");
    expect(formatCurrency(1234.5).replace(/\u00A0/g, " ")).toBe("R$ 1.234,50");
  });

  it("formata zero corretamente", () => {
    expect(formatCurrency(0).replace(/\u00A0/g, " ")).toBe("R$ 0,00");
  });

  it("formata valores negativos", () => {
    const r = formatCurrency(-50).replace(/\u00A0/g, " ");
    expect(r).toContain("50,00");
    expect(r).toContain("-");
  });

  it("arredonda casas decimais para 2", () => {
    expect(formatCurrency(9.999).replace(/\u00A0/g, " ")).toBe("R$ 10,00");
  });
});

describe("generateSlug", () => {
  it("converte texto para slug minusculo com hifens", () => {
    expect(generateSlug("Camisa Polo")).toBe("camisa-polo");
  });

  it("remove acentos", () => {
    expect(generateSlug("Calca Jeans")).toBe("calca-jeans");
    expect(generateSlug("Bone")).toBe("bone");
    expect(generateSlug("Acucar Cristal")).toBe("acucar-cristal");
  });

  it("colapsa multiplos espacos e hifens", () => {
    expect(generateSlug("A   B")).toBe("a-b");
    expect(generateSlug("A---B")).toBe("a-b");
  });

  it("remove caracteres especiais", () => {
    expect(generateSlug("Camisa #1 (Nova!)")).toBe("camisa-1-nova");
  });
});

describe("generateSKU", () => {
  it("usa as 3 primeiras letras de fornecedor e cor em maiusculo", () => {
    const sku = generateSKU("Fornecedor", "Azul");
    expect(sku.startsWith("FOR-AZU-")).toBe(true);
  });

  it("inclui o tamanho quando informado", () => {
    const sku = generateSKU("Fornecedor", "Azul", "m");
    expect(sku.startsWith("FOR-AZU-M-")).toBe(true);
  });

  it("gera sufixos diferentes (parte aleatoria) em chamadas distintas", () => {
    const a = generateSKU("Fornecedor", "Azul");
    const b = generateSKU("Fornecedor", "Azul");
    // A parte fixa e igual, mas o codigo completo deve variar pelo random
    expect(a).not.toBe(b);
  });
});