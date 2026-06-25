import { describe, it, expect } from "vitest";
import { resolverSlugUnico, gerarSlugBase } from "./registro";

describe("gerarSlugBase", () => {
  it("gera slug a partir do nome da loja", () => {
    expect(gerarSlugBase("Moda Bella")).toBe("moda-bella");
  });

  it("remove acentos e caracteres especiais", () => {
    expect(gerarSlugBase("Calçados & Cia!")).toBe("calcados-cia");
  });

  it("usa fallback 'loja' quando o nome nao gera caracteres validos", () => {
    expect(gerarSlugBase("!!!")).toBe("loja");
    expect(gerarSlugBase("")).toBe("loja");
  });
});

describe("resolverSlugUnico", () => {
  it("retorna o proprio slug quando nao ha colisao", () => {
    expect(resolverSlugUnico("moda-bella", [])).toBe("moda-bella");
    expect(resolverSlugUnico("moda-bella", ["outra-loja"])).toBe("moda-bella");
  });

  it("adiciona sufixo -2 na primeira colisao", () => {
    expect(resolverSlugUnico("moda-bella", ["moda-bella"])).toBe("moda-bella-2");
  });

  it("incrementa o sufixo ate achar um livre", () => {
    expect(
      resolverSlugUnico("moda-bella", ["moda-bella", "moda-bella-2", "moda-bella-3"])
    ).toBe("moda-bella-4");
  });

  it("acha buracos nao ocupados na sequencia", () => {
    // -2 ocupado, mas -3 livre
    expect(resolverSlugUnico("loja", ["loja", "loja-2"])).toBe("loja-3");
  });
});