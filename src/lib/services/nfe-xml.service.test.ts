import { describe, it, expect } from "vitest";
import { buildNFeXml, buildInfNFe, type NfeEmissaoParams } from "./nfe-xml.service";

// Parâmetros base reaproduzindo o caso real que causava rejeição da SEFAZ
// (cStat 215 - "Falha no esquema XML"). Veja histórico de correções nesta
// suíte para o contexto de cada regra.
function baseParams(overrides: Partial<NfeEmissaoParams> = {}): NfeEmissaoParams {
  return {
    modelo: "55",
    serie: 1,
    numero: 1,
    cNF: "12345678",
    dataEmissao: new Date("2026-07-17T22:27:59-03:00"),
    ambiente: "2",
    finalidade: 1,
    naturezaOperacao: "Venda de mercadoria",
    emitente: {
      cnpj: "65596054000107",
      nome: "California Store",
      regimeTributario: "SIMPLES_NACIONAL",
      endereco: "Av Teste",
      numero: "500",
      bairro: "Centro",
      cidade: "Campo Grande",
      estado: "MS",
      cep: "79000000",
      telefone: "6796517613",
      ibgeCodigoCidade: "5002704",
    },
    destinatario: {
      cpfCnpj: "07202757176",
      nome: "CLIENTE TESTE",
      endereco: "Rua Teste",
      numero: "100",
      bairro: "Centro",
      cidade: "Coxim",
      estado: "MS",
      cep: "79400000",
      indIEDest: 9,
      ibgeCodigoCidade: "5003702",
    },
    itens: [
      {
        codigo: "PROD1",
        nome: "Camiseta Teste",
        ncm: "62046200",
        cfop: "5102",
        csosn: "102",
        origem: 0,
        quantidade: 1,
        precoUnitario: 49.9,
        valorTotal: 49.9,
      },
    ],
    totais: {
      baseCalculoICMS: 49.9,
      valorICMS: 0,
      valorProdutos: 49.9,
      valorFrete: 0,
      valorSeguro: 0,
      valorDesconto: 0,
      valorTotal: 49.9,
    },
    pagamentos: [{ forma: "01", valor: 49.9 }],
    ...overrides,
  };
}

describe("nfe-xml.service — regras de schema NFe 4.00", () => {
  it("não emite tag <email> vazia quando o cliente não tem e-mail (minLength=1 no schema)", () => {
    const params = baseParams();
    params.destinatario.email = undefined;
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).not.toMatch(/<email\s*\/>|<email>\s*<\/email>/);
  });

  it("emite <email> com valor quando o cliente tem e-mail", () => {
    const params = baseParams();
    params.destinatario.email = "cliente@teste.com";
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<email>cliente@teste.com</email>");
  });

  it("não emite tag <fone> vazia para o emitente (pattern exige 6-14 dígitos)", () => {
    const params = baseParams();
    params.emitente.telefone = undefined;
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).not.toMatch(/<fone>\s*<\/fone>/);
  });

  it("ICMSSN102 (CSOSN sem crédito) não inclui pCredSN/vCredICMSSN", () => {
    const params = baseParams();
    params.itens[0].csosn = "102";
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<ICMSSN102>");
    expect(xml).not.toContain("pCredSN");
    expect(xml).not.toContain("vCredICMSSN");
  });

  it("ICMSSN101 (CSOSN com crédito) inclui pCredSN/vCredICMSSN", () => {
    const params = baseParams();
    params.itens[0].csosn = "101";
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<ICMSSN101>");
    expect(xml).toContain("<pCredSN>");
    expect(xml).toContain("<vCredICMSSN>");
  });

  it("ICMSTot inclui todos os campos obrigatórios do schema (vFCP, vBCST, vST, vFCPST, vFCPSTRet, vIPIDevol)", () => {
    const params = baseParams();
    const xml = buildInfNFe(params, "chave-teste");
    for (const tag of ["vFCP", "vBCST", "vST", "vFCPST", "vFCPSTRet", "vIPIDevol"]) {
      expect(xml).toContain(`<${tag}>`);
    }
  });

  it("idDest=1 quando emitente e destinatário são do mesmo estado", () => {
    const params = baseParams();
    params.emitente.estado = "MS";
    params.destinatario.estado = "MS";
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<idDest>1</idDest>");
  });

  it("idDest=2 quando destinatário é de outro estado (operação interestadual)", () => {
    const params = baseParams();
    params.emitente.estado = "MS";
    params.destinatario.estado = "SP";
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<idDest>2</idDest>");
  });

  it("cMun do destinatário usa o código IBGE informado, não o do emitente", () => {
    const params = baseParams();
    params.destinatario.ibgeCodigoCidade = "5003702"; // Coxim/MS
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<cMun>5003702</cMun>");
  });

  it("NCM com menos de 8 dígitos é preenchido com zeros à esquerda", () => {
    const params = baseParams();
    params.itens[0].ncm = "1234567"; // 7 dígitos (zero à esquerda perdido)
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<NCM>01234567</NCM>");
  });

  it("código de barras com tamanho inválido cai para SEM GTIN", () => {
    const params = baseParams();
    params.itens[0].codigoBarras = "123456789"; // 9 dígitos - inválido
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<cEAN>SEM GTIN</cEAN>");
  });

  it("código de barras válido (13 dígitos) é mantido", () => {
    const params = baseParams();
    params.itens[0].codigoBarras = "7891234567895";
    const xml = buildInfNFe(params, "chave-teste");
    expect(xml).toContain("<cEAN>7891234567895</cEAN>");
  });

  it("buildNFeXml produz XML bem formado com declaração e namespace", () => {
    const params = baseParams();
    const xml = buildNFeXml(params, "chave-teste");
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('xmlns="http://www.portalfiscal.inf.br/nfe"');
  });
});
