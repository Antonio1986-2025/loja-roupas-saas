// ============================================
// Serviço de emissão de NF-e / NFC-e
// Fluxo completo: load → build XML → sign → send → save
// ============================================

import prisma from "@/lib/prisma";
import {
  getSefazConfig,
  getEndpoint,
  getSoapAction,
  signXml,
  extractPfx,
  buildSoapEnvelope,
  sendSoapRequest,
  extractTag,
  parseSoapResponse,
  NfeSoapError,
} from "@/lib/nfe-soap";
import {
  gerarChaveAcesso,
  gerarCNF,
  buildNFeXml,
  buildEnviNFe,
  mapFormaPagamento,
  type EmitenteData,
  type DestinatarioData,
  type NfeItemData,
  type NfeTotalData,
  type NfePagamento,
} from "@/lib/services/nfe-xml.service";

export class NfeEmissaoError extends Error {
  code: string;
  sCodigo?: string;
  constructor(code: string, message: string, sCodigo?: string) {
    super(message);
    this.code = code;
    this.sCodigo = sCodigo;
    this.name = "NfeEmissaoError";
  }
}

// ============================================
// Tipos
// ============================================

interface EmissaoResult {
  id: string;
  chaveAcesso: string;
  protocolo: string;
  status: string;
  cStat: string;
  xMotivo: string;
  numero: number;
  serie: number;
}

// ============================================
// Carregar dados da venda
// ============================================

async function carregarVenda(tenantId: string, vendaId: string) {
  const venda = await prisma.venda.findFirst({
    where: { id: vendaId, tenantId },
    include: {
      itens: {
        include: {
          variante: {
            include: {
              produto: { select: { id: true, nome: true, ncm: true, cest: true } },
            },
          },
        },
      },
      cliente: true,
      pagamentos: true,
    },
  });

  if (!venda) throw new NfeEmissaoError("VENDA_NAO_ENCONTRADA", "Venda não encontrada");
  if (venda.status !== "CONCLUIDA") throw new NfeEmissaoError("VENDA_NAO_CONCLUIDA", "Apenas vendas concluídas podem gerar NF-e");

  return venda;
}

// ============================================
// Carregar configuração do emitente
// ============================================

async function carregarEmitente(tenantId: string): Promise<EmitenteData> {
  const config = await prisma.configuracao.findUnique({ where: { tenantId } });
  if (!config) throw new NfeEmissaoError("CONFIG_NAO_ENCONTRADA", "Configuração não encontrada");
  if (!config.cnpj) throw new NfeEmissaoError("CNPJ_NAO_CONFIGURADO", "Configure o CNPJ da empresa nas Configurações");

  return {
    cnpj: config.cnpj,
    nome: config.nomeEmpresa || "Empresa",
    nomeFantasia: config.nomeEmpresa,
    inscricaoEstadual: config.inscricaoEstadual || undefined,
    inscricaoMunicipal: config.inscricaoMunicipal || undefined,
    regimeTributario: config.regimeTributario || "SIMPLES_NACIONAL",
    endereco: config.endereco || "",
    numero: config.numero || "S/N",
    bairro: config.bairro || "",
    cidade: config.cidade || "Campo Grande",
    estado: config.estado || "MS",
    cep: config.cep || "",
    telefone: config.telefone || undefined,
    email: config.email || undefined,
    ibgeCodigoCidade: config.ibgeCodigoCidade || "5002704",
  };
}

// ============================================
// Obter próximo número de NF-e
// ============================================

async function obterProximoNumero(tenantId: string, modelo: string): Promise<{ serie: number; numero: number }> {
  const config = await prisma.configuracao.findUnique({ where: { tenantId } });
  if (!config) throw new NfeEmissaoError("CONFIG_NAO_ENCONTRADA", "Configuração não encontrada");

  const serie = modelo === "65" ? config.nfceSerie : config.nfeSerie;
  const numero = modelo === "65" ? config.nfceNumero : config.nfeNumero;

  return { serie, numero };
}

async function incrementarNumero(tenantId: string, modelo: string, novoNumero: number): Promise<void> {
  const data = modelo === "65"
    ? { nfceNumero: novoNumero }
    : { nfeNumero: novoNumero };

  await prisma.configuracao.update({ where: { tenantId }, data });
}

// ============================================
// Processar resposta SEFAZ
// ============================================

interface SefazRetorno {
  cStat: string;
  xMotivo: string;
  nProt: string | null;
  recibo: string | null;
  xmlAssinado: string | null;
}

function parseAutorizacaoResponse(responseXml: string): SefazRetorno {
  // Tenta extrair o body do SOAP (prefixo pode variar: soap:, S:, soapenv:, ns0:, etc.)
  let body = responseXml;
  const soapBody = responseXml.match(/<(?:\w+:)?Body[^>]*>([\s\S]*?)<\/(?:\w+:)?Body>/i);
  if (soapBody) body = soapBody[1];

  // Verifica se é SOAP fault (mesmo problema de prefixo variável)
  const fault = body.match(/<(?:\w+:)?Fault[^>]*>([\s\S]*?)<\/(?:\w+:)?Fault>/i);
  if (fault) {
    const faultText = extractTag(fault[1], "Text") || extractTag(fault[1], "faultstring") || fault[1];
    throw new NfeEmissaoError("SEFAZ_FAULT", "SOAP Fault: " + faultText.substring(0, 500));
  }

  // Tenta extrair com e sem namespace
  let cStat = extractTag(body, "cStat") || extractTag(body, "ns2:cStat") || extractTag(body, "ns3:cStat");
  let xMotivo = extractTag(body, "xMotivo") || extractTag(body, "ns2:xMotivo") || extractTag(body, "ns3:xMotivo");

  if (!cStat) throw new NfeEmissaoError("SEFAZ_SEM_RESPOSTA", "SEFAZ não retornou status. Resposta: " + responseXml.substring(0, 500));

  // 100 = Autorizada (assíncrono, veio recibo)
  // 104 = Lote processado (síncrono)
  // 105 = Em processamento (assíncrono)
  // 106 = Denegada
  // Outros = Rejeição

  const nProt = extractTag(body, "nProt");
  const recibo = extractTag(body, "nRec");

  // Extrai o XML da NFe autorizada (com protocolo)
  const protNFe = body; // o body já contém o XML com protocolo

  return { cStat: cStat || "", xMotivo: xMotivo || "", nProt, recibo, xmlAssinado: protNFe };
}

// ============================================
// Função principal: emitir NF-e
// ============================================

export async function emitirNFe(
  tenantId: string,
  vendaId: string,
  tipo: "NFE" | "NFCE" = "NFE"
): Promise<EmissaoResult> {
  const modelo = tipo === "NFCE" ? "65" : "55";
  const CODIGO_UF = "50";

  // 1. Verificar se já existe NF-e emitida para esta venda
  const existente = await prisma.notaFiscal.findFirst({
    where: { vendaId, tenantId, status: { in: ["AUTORIZADA", "ENVIADA"] } },
  });
  if (existente) {
    throw new NfeEmissaoError("NF_JA_EMITIDA", `NF-e já emitida para esta venda (#${existente.numero})`);
  }

  // 2. Carregar dados
  const venda = await carregarVenda(tenantId, vendaId);
  const emitente = await carregarEmitente(tenantId);
  const sefazConfig = await getSefazConfig(tenantId);
  const config = await prisma.configuracao.findUnique({ where: { tenantId } });
  const ambiente = config?.ambienteNFe ?? "2";

  // 3. Obter numeração
  const { serie, numero } = await obterProximoNumero(tenantId, modelo);
  const cNF = gerarCNF();

  // 4. Preparar destinatário
  const cliente = venda.cliente;
  const destinatario: DestinatarioData = {
    cpfCnpj: cliente?.cpf || (modelo === "65" ? "00000000000" : "00000000000191"),
    nome: cliente?.nome || "CONSUMIDOR FINAL",
    endereco: cliente?.endereco || undefined,
    numero: (cliente as any)?.numero || undefined,
    bairro: (cliente as any)?.bairro || undefined,
    cidade: cliente?.cidade || undefined,
    estado: cliente?.estado || undefined,
    cep: cliente?.cep || undefined,
    telefone: cliente?.telefone || undefined,
    email: cliente?.email || undefined,
    inscricaoEstadual: (cliente as any)?.inscricaoEstadual || undefined,
    indIEDest: (cliente as any)?.indIEDest ?? 9,
  };

  // 5. Preparar itens (com varianteId real, necessário para FK)
  const itensComVariante = venda.itens
    .map((vi) => ({
      varianteId: vi.varianteId,
      nfeItem: {
        codigo: vi.variante.codigoInterno || vi.variante.id.slice(0, 8),
        codigoBarras: vi.variante.codigoBarras || undefined,
        nome: vi.variante.produto.nome,
        ncm: (vi.variante.produto as any).ncm || undefined,
        cfop: (vi.variante as any).cfop || config?.cfopPadrao || "5102",
        cest: (vi.variante.produto as any).cest || undefined,
        csosn: (vi.variante as any).csosn || "102",
        origem: (vi.variante as any).origem ?? 0,
        quantidade: vi.quantidade - (vi.qtdDevolvida || 0),
        precoUnitario: Number(vi.precoUnit),
        valorTotal: Number(vi.subtotal),
      } as NfeItemData,
    }))
    .filter((i) => i.nfeItem.quantidade > 0);

  const itens: NfeItemData[] = itensComVariante.map((i) => i.nfeItem);

  if (itens.length === 0) {
    throw new NfeEmissaoError("SEM_ITENS", "Não há itens para emitir NF-e");
  }

  // 6. Preparar totais
  const totais: NfeTotalData = {
    baseCalculoICMS: Number(venda.total),
    valorICMS: 0, // Simples Nacional — ICMS incluso no DAS
    valorProdutos: Number(venda.subtotal),
    valorFrete: 0,
    valorSeguro: 0,
    valorDesconto: Number(venda.desconto || 0),
    valorTotal: Number(venda.total),
  };

  // 7. Preparar pagamentos
  const pagamentos: NfePagamento[] = venda.pagamentos.map((p) => ({
    forma: mapFormaPagamento(p.formaPagamento),
    valor: Number(p.valor),
  }));

  // 8. Gerar chave de acesso
  const chaveAcesso = gerarChaveAcesso({
    cUF: CODIGO_UF,
    dhEmi: new Date(),
    cnpj: emitente.cnpj,
    modelo,
    serie,
    nNF: numero,
    tpEmis: "1",
    cNF,
  });

  // 9. Construir XML
  const nfeXml = buildNFeXml(
    {
      modelo,
      serie,
      numero,
      cNF,
      dataEmissao: new Date(),
      ambiente,
      finalidade: 1,
      naturezaOperacao: "Venda de mercadoria",
      emitente,
      destinatario,
      itens,
      totais,
      pagamentos,
      observacao: `Venda #${venda.numero}`,
    },
    chaveAcesso
  );

  // 10. Extrair chave e certificado
  const { certPem, keyPem } = extractPfx(sefazConfig.pfxBase64, sefazConfig.senhaCertificado);

  // 11. Assinar XML (assinar <infNFe>)
  const signedNfe = signXml(
    nfeXml,
    certPem,
    keyPem,
    "//*[local-name()='infNFe']",
    `NFe${chaveAcesso}`,
    "infNFe"
  );

  // 12. Envelopar em <enviNFe>
  const lote = String(Math.floor(Date.now() / 1000));
  const enviNFe = buildEnviNFe(signedNfe, lote, "1");

  // 13. Enviar para SEFAZ (síncrono)
  const endpoint = getEndpoint(CODIGO_UF, "NfeAutorizacao", ambiente);
  const soapAction = getSoapAction("NfeAutorizacao");
  const soapXml = buildSoapEnvelope(enviNFe, "NfeAutorizacao", CODIGO_UF, "4.00");

  console.log(`[NF-e] Enviando NF-e #${numero} para ${endpoint} (ambiente=${ambiente})`);
  console.log("[NF-e] XML enviNFe (first 1500 chars):", enviNFe.substring(0, 1500));

  let responseXml: string;
  try {
    responseXml = await sendSoapRequest(
      endpoint,
      soapXml,
      certPem,
      keyPem,
      soapAction
    );
  } catch (err: any) {
    throw new NfeEmissaoError(
      "ERRO_ENVIO_SEFAZ",
      err.message || "Erro ao comunicar com SEFAZ",
      err.sCodigo
    );
  }

  // 14. Parse da resposta
  console.log("[NF-e] SEFAZ response (first 1000 chars):", responseXml.substring(0, 1000));
  const retorno = parseAutorizacaoResponse(responseXml);

  // 15. Determinar status
  let statusNfe = "REJEITADA";
  let nProt: string | null = null;
  let xmlAssinado: string | null = null;

  if (retorno.cStat === "100" || retorno.cStat === "104") {
    // Autorizada
    statusNfe = "AUTORIZADA";
    nProt = retorno.nProt;
    xmlAssinado = retorno.xmlAssinado;
  } else if (retorno.cStat === "105") {
    // Em processamento — tentar consultar recibo (modo assíncrono)
    statusNfe = "ENVIADA";
  } else if (retorno.cStat === "106" || retorno.cStat === "110") {
    statusNfe = "DENEGADA";
  }

  // 16. Salvar no banco
  const nota = await (prisma.notaFiscal as any).create({
    data: {
      tenantId,
      vendaId: venda.id,
      tipo,
      modelo,
      serie,
      numero,
      chaveAcesso,
      cNF,
      digVal: chaveAcesso.slice(-1),
      status: statusNfe as any,
      cStat: retorno.cStat,
      xMotivo: retorno.xMotivo || undefined,
      nProt: nProt || undefined,
      dhRecbto: nProt ? new Date() : undefined,
      recibo: retorno.recibo || undefined,
      naturezaOperacao: "Venda de mercadoria",
      finalidade: 1,
      tpNF: 1,
      valorProdutos: totais.valorProdutos,
      valorTotal: totais.valorTotal,
      valorDesconto: totais.valorDesconto > 0 ? totais.valorDesconto : undefined,
      valorFrete: totais.valorFrete > 0 ? totais.valorFrete : undefined,
      baseCalculoICMS: totais.baseCalculoICMS,
      valorICMS: totais.valorICMS > 0 ? totais.valorICMS : undefined,
      clienteNome: destinatario.nome,
      clienteCpfCnpj: destinatario.cpfCnpj,
      clienteEndereco: destinatario.endereco || undefined,
      clienteNumero: destinatario.numero || undefined,
      clienteBairro: destinatario.bairro || undefined,
      clienteCidade: destinatario.cidade || undefined,
      clienteEstado: destinatario.estado || undefined,
      clienteCep: destinatario.cep || undefined,
      clienteTelefone: destinatario.telefone || undefined,
      xmlEnvio: enviNFe,
      xmlAssinado: xmlAssinado || undefined,
      ambiente: Number(ambiente),
      dataEmissao: new Date(),
      itens: {
        create: itensComVariante.map((item) => ({
          varianteId: item.varianteId,
          quantidade: item.nfeItem.quantidade,
          precoUnitario: item.nfeItem.precoUnitario,
          valorTotal: item.nfeItem.valorTotal,
          ncm: item.nfeItem.ncm || undefined,
          cfop: item.nfeItem.cfop || undefined,
          csosn: item.nfeItem.csosn || "102",
          origem: item.nfeItem.origem || 0,
          aliquotaICMS: (item.nfeItem as any).aliquotaICMS || undefined,
        })),
      },
    },
  });

  // 17. Incrementar numeração
  await incrementarNumero(tenantId, modelo, numero + 1);

  // 18. Verificar se foi autorizada
  if (statusNfe === "REJEITADA" || statusNfe === "DENEGADA") {
    throw new NfeEmissaoError(
      `SEFAZ_${retorno.cStat}`,
      retorno.xMotivo || `Rejeição código ${retorno.cStat}`,
      retorno.cStat
    );
  }

  return {
    id: nota.id,
    chaveAcesso,
    protocolo: nProt || "",
    status: statusNfe,
    cStat: retorno.cStat,
    xMotivo: retorno.xMotivo || "",
    numero,
    serie,
  };
}

// ============================================
// Cancelar NF-e
// ============================================

export async function cancelarNFe(
  tenantId: string,
  notaFiscalId: string,
  justificativa: string
): Promise<{ protocolo: string; status: string }> {
  const nota = await prisma.notaFiscal.findFirst({
    where: { id: notaFiscalId, tenantId },
  });

  if (!nota) throw new NfeEmissaoError("NF_NAO_ENCONTRADA", "NF-e não encontrada");
  if (nota.status !== "AUTORIZADA") throw new NfeEmissaoError("NF_NAO_AUTORIZADA", "Apenas NF-e autorizada pode ser cancelada");
  if (!justificativa || justificativa.length < 15) throw new NfeEmissaoError("JUSTIFICATIVA_CURTA", "Justificativa deve ter pelo menos 15 caracteres");

  const sefazConfig = await getSefazConfig(tenantId);
  const { certPem, keyPem } = extractPfx(sefazConfig.pfxBase64, sefazConfig.senhaCertificado);
  const config = await prisma.configuracao.findUnique({ where: { tenantId } });
  const ambiente = config?.ambienteNFe ?? "2";
  const CODIGO_UF = "50";

  const dataHora = new Date();
  const tpEvento = "110111"; // Cancelamento
  const nSeqEvento = "1";

  // Monta XML de cancelamento
  const chave = nota.chaveAcesso || "";

  const eventoXml = `<?xml version="1.0" encoding="UTF-8"?>
<evento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <infEvento Id="ID${tpEvento}${chave}${padLeft(nSeqEvento, 2)}">
    <cOrgao>${CODIGO_UF}</cOrgao>
    <tpAmb>${ambiente}</tpAmb>
    <CNPJ>${formatCNPJ(config?.cnpj || "")}</CNPJ>
    <chNFe>${chave}</chNFe>
    <dhEvento>${formatDateISO(dataHora)}</dhEvento>
    <tpEvento>${tpEvento}</tpEvento>
    <nSeqEvento>${nSeqEvento}</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>Cancelamento</descEvento>
      <nProt>${nota.nProt || ""}</nProt>
      <xJust>${escapeXml(justificativa.slice(0, 255))}</xJust>
    </detEvento>
  </infEvento>
</evento>`;

  const signedEvento = signXml(
    eventoXml,
    certPem,
    keyPem,
    "//*[local-name()='infEvento']",
    `ID${tpEvento}${chave}${padLeft(nSeqEvento, 2)}`,
    "infEvento"
  );

  const endpoint = getEndpoint(CODIGO_UF, "NfeCancelamento", ambiente);
  const soapAction = getSoapAction("NfeCancelamento");
  const soapXml = buildSoapEnvelope(signedEvento, "NfeCancelamento", CODIGO_UF, "1.00");

  const responseXml = await sendSoapRequest(
    endpoint,
    soapXml,
    certPem,
    keyPem,
    soapAction
  );

  const { body } = parseSoapResponse(responseXml);
  const cStat = extractTag(body, "cStat");
  const xMotivo = extractTag(body, "xMotivo");
  const nProt = extractTag(body, "nProt");

  if (cStat !== "135" && cStat !== "101") {
    throw new NfeEmissaoError("CANCELAMENTO_REJEITADO", xMotivo || `Código ${cStat}`, cStat || undefined);
  }

  await prisma.notaFiscal.update({
    where: { id: notaFiscalId },
    data: {
      status: "CANCELADA",
      justificativaCancelamento: justificativa,
      dataCancelamento: new Date(),
    },
  });

  return { protocolo: nProt || "", status: "CANCELADA" };
}

// ============================================
// Helpers
// ============================================

function padLeft(value: string | number, length: number, char: string = "0"): string {
  return String(value).padStart(length, char);
}

function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "").padStart(14, "0");
}

function formatDateISO(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "-03:00");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
