// ============================================
// Serviço de consulta de NF-e na SEFAZ
// Refatorado para usar nfe-soap.ts compartilhado
// ============================================

import prisma from "@/lib/prisma";
import {
  getSefazConfig,
  getEndpoint,
  getSoapAction,
  signXml,
  extractPfx,
  certToBase64,
  buildSoapEnvelope,
  sendSoapRequest,
  extractTag,
  parseSoapResponse,
  NfeSoapError,
} from "@/lib/nfe-soap";

export class NfeConsultaError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "NfeConsultaError";
  }
}

function buildConsSefazXml(chave: string, ambiente: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<consSefaz versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <tpAmb>${ambiente}</tpAmb>
  <xServ>CONSULTAR</xServ>
  <chNFe>${chave}</chNFe>
</consSefaz>`;
}

interface NfeConsultaResult {
  cStat: string | null;
  xMotivo: string | null;
  chNFe: string | null;
  nProt: string | null;
  dhRecbto: string | null;
  xml: string;
}

function parseConsultaResponse(xml: string): NfeConsultaResult {
  const cStat = extractTag(xml, "cStat");
  const xMotivo = extractTag(xml, "xMotivo");

  if (cStat !== "100" && cStat !== "101") {
    throw new NfeConsultaError("SEFAZ_ERRO", `SEFAZ: ${xMotivo || `Código ${cStat}`}`);
  }

  const nfe = extractTag(xml, "resNFe") || extractTag(xml, "protNFe") || xml;

  return {
    cStat,
    xMotivo,
    chNFe: extractTag(xml, "chNFe"),
    nProt: extractTag(xml, "nProt"),
    dhRecbto: extractTag(xml, "dhRecbto"),
    xml: nfe,
  };
}

export async function consultarNfe(chave: string, tenantId: string): Promise<NfeConsultaResult> {
  const chaveLimpa = chave.replace(/\D/g, "");
  if (chaveLimpa.length !== 44) {
    throw new NfeConsultaError("CHAVE_INVALIDA", "Chave de acesso deve ter 44 dígitos");
  }

  const cUf = chaveLimpa.substring(0, 2);

  // Busca certificado
  const sefazConfig = await getSefazConfig(tenantId);

  // Extrair chave e certificado do PFX
  const { certPem, keyPem } = extractPfx(sefazConfig.pfxBase64, sefazConfig.senhaCertificado);

  // Ambiente (homologação/produção)
  const config = await prisma.configuracao.findUnique({ where: { tenantId } });
  const ambiente = config?.ambienteNFe ?? "2";

  // Endpoint
  const endpoint = getEndpoint(cUf, "NfeConsultaProtocolo", ambiente);

  // XML de consulta
  const consXml = buildConsSefazXml(chaveLimpa, ambiente);

  // Assinar
  const signedXml = signXml(
    consXml,
    certPem,
    keyPem,
    "//*[local-name()='consSefaz']",
    "",
    "consSefaz"
  );

  // SOAP
  const soapXml = buildSoapEnvelope(signedXml, "NfeConsultaProtocolo", cUf, "4.00");
  const soapAction = getSoapAction("NfeConsultaProtocolo");

  // Enviar
  const responseXml = await sendSoapRequest(
    endpoint,
    soapXml,
    certPem,
    keyPem,
    soapAction
  );

  // Parse
  const { body } = parseSoapResponse(responseXml);
  return parseConsultaResponse(body);
}
