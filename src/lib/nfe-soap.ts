// ============================================
// Módulo compartilhado para comunicação SOAP com SEFAZ
// Extraído de nfe-consulta.ts — funções reutilizáveis
// para consulta, autorização, cancelamento e inutilização
// ============================================

import prisma from "@/lib/prisma";
import https from "https";
import tls from "tls";

const SEFAZ_AMBIENTE = process.env.SEFAZ_AMBIENTE === "1" ? "1" : "2";

export const UF_CODIGOS: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA",
  "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE",
  "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE",
  "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT",
  "52": "GO", "53": "DF",
};

// Serviços SEFAZ por UF (MS = "50")
interface ServicoEndpoints {
  producao: string;
  homologacao: string;
}

// MS - Mato Grosso do Sul (serviço próprio, não SVRS)
const MS_PRODUCAO = "https://nfe.sefaz.ms.gov.br/services2/services";
const MS_HOMOLOGACAO = "https://nfe.sefaz.ms.gov.br/services2/services";

function svcUrl(base: string, svc: string): string {
  return `${base}/${svc}`;
}

const SERVICOS_MS: Record<string, ServicoEndpoints> = {
  NfeConsultaProtocolo: {
    producao: svcUrl(MS_PRODUCAO, "NfeConsultaProtocolo4"),
    homologacao: svcUrl(MS_HOMOLOGACAO, "NfeConsultaProtocolo4"),
  },
  NfeAutorizacao: {
    producao: svcUrl(MS_PRODUCAO, "NfeAutorizacao4"),
    homologacao: svcUrl(MS_HOMOLOGACAO, "NfeAutorizacao4"),
  },
  NfeRetAutorizacao: {
    producao: svcUrl(MS_PRODUCAO, "NfeRetAutorizacao4"),
    homologacao: svcUrl(MS_HOMOLOGACAO, "NfeRetAutorizacao4"),
  },
  NfeCancelamento: {
    producao: svcUrl(MS_PRODUCAO, "NfeCancelamento4"),
    homologacao: svcUrl(MS_HOMOLOGACAO, "NfeCancelamento4"),
  },
  NfeInutilizacao: {
    producao: svcUrl(MS_PRODUCAO, "NfeInutilizacao4"),
    homologacao: svcUrl(MS_HOMOLOGACAO, "NfeInutilizacao4"),
  },
  NfeStatusServico: {
    producao: svcUrl(MS_PRODUCAO, "NfeStatusServico4"),
    homologacao: svcUrl(MS_HOMOLOGACAO, "NfeStatusServico4"),
  },
};

// Ações SOAP por serviço
const SOAP_ACTIONS: Record<string, string> = {
  NfeConsultaProtocolo: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/consultar",
  NfeAutorizacao: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote",
  NfeRetAutorizacao: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4/nfeRetAutorizacaoLote",
  NfeCancelamento: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeCancelamento4/nfeCancelamentoNF",
  NfeInutilizacao: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4/inutilizar",
  NfeStatusServico: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/status",
};

export class NfeSoapError extends Error {
  code: string;
  sCodigo?: string;
  constructor(code: string, message: string, sCodigo?: string) {
    super(message);
    this.code = code;
    this.sCodigo = sCodigo;
    this.name = "NfeSoapError";
  }
}

// ============================================
// Configuração SEFAZ (certificado)
// ============================================

interface SefazCertConfig {
  pfxBase64: string;
  senhaCertificado: string;
  certPem: string;
  keyPem: string;
}

export async function getSefazConfig(tenantId: string): Promise<SefazCertConfig> {
  const config = await prisma.configuracao.findUnique({ where: { tenantId } });
  if (!config?.certificadoA1 || !config?.senhaCertificado) {
    throw new NfeSoapError("SEM_CERTIFICADO", "Configure o certificado A1 e a senha nas Configurações.");
  }
  return {
    pfxBase64: config.certificadoA1,
    senhaCertificado: config.senhaCertificado,
    certPem: "",
    keyPem: "",
  };
}

export async function getAmbienteConfig(tenantId: string): Promise<{ ambiente: string; ibgeCodigoCidade: string | null }> {
  const config = await prisma.configuracao.findUnique({ where: { tenantId } });
  return {
    ambiente: config?.ambienteNFe || "2",
    ibgeCodigoCidade: config?.ibgeCodigoCidade || null,
  };
}

// ============================================
// Endpoints SEFAZ
// ============================================

export function getEndpoint(cUf: string, servico: string, ambiente?: string): string {
  const amb = (ambiente || SEFAZ_AMBIENTE) === "1" ? "producao" : "homologacao";

  if (cUf === "50") {
    const svc = SERVICOS_MS[servico];
    if (!svc) throw new NfeSoapError("SERVICO_NAO_SUPORTADO", `Serviço ${servico} não configurado para MS`);
    return svc[amb];
  }

  // Fallback: usar URL do MS para qualquer UF (pode ser estendido depois)
  const svc = SERVICOS_MS[servico];
  if (!svc) throw new NfeSoapError("SERVICO_NAO_SUPORTADO", `Serviço ${servico} não configurado`);
  return svc[amb];
}

export function getSoapAction(servico: string): string {
  const action = SOAP_ACTIONS[servico];
  if (!action) throw new NfeSoapError("ACAO_NAO_ENCONTRADA", `Ação SOAP para ${servico} não encontrada`);
  return action;
}

// ============================================
// Assinatura XML
// ============================================

export function certToBase64(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\s/g, "");
}

export function signXml(
  xml: string,
  certPem: string,
  keyPem: string,
  referenceXPath: string,
  referenceUri: string,
  localName: string,
  namespacePrefix?: string
): string {
  const { SignedXml } = require("xml-crypto");

  const sig = new SignedXml();
  sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
  sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
  sig.addReference({
    xpath: referenceXPath,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    uri: referenceUri || undefined,
  });
  sig.privateKey = keyPem;
  sig.keyInfoProvider = {
    getKeyInfo: () =>
      `<X509Data><X509Certificate>${certToBase64(certPem)}</X509Certificate></X509Data>`,
  };
  sig.computeSignature(xml);
  return sig.getSignedXml();
}

// ============================================
// Extração de certificado PFX
// ============================================

export function extractPfx(
  pfxBase64: string,
  senha: string
): { certPem: string; keyPem: string } {
  const forge = require("node-forge");

  const p12 = forge.pkcs12.pkcs12FromAsn1(
    forge.asn1.fromDer(
      forge.util.createBuffer(Buffer.from(pfxBase64, "base64").toString("binary"))
    ),
    false,
    senha
  );

  const keyBag =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ||
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];

  const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];

  if (!keyBag || !certBag) {
    throw new NfeSoapError("CERTIFICADO_INVALIDO", "Não foi possível extrair chave ou certificado do PFX.");
  }

  return {
    keyPem: forge.pki.privateKeyToPem(keyBag.key),
    certPem: forge.pki.certificateToPem(certBag.cert),
  };
}

// ============================================
// SOAP Envelope
// ============================================

export function buildSoapEnvelope(
  signedXml: string,
  servico: string,
  cUf: string,
  versaoDados: string = "4.00"
): string {
  // Mapeia nome do serviço para tag de cabeçalho SOAP e corpo
  const serviceTags: Record<string, { cabec: string; corpo: string }> = {
    NfeConsultaProtocolo: { cabec: "nfeCabecMsg", corpo: "nfeDadosMsg" },
    NfeAutorizacao: { cabec: "nfeCabecMsg", corpo: "nfeDadosMsg" },
    NfeRetAutorizacao: { cabec: "nfeCabecMsg", corpo: "nfeDadosMsg" },
    NfeCancelamento: { cabec: "nfeCabecMsg", corpo: "nfeDadosMsg" },
    NfeInutilizacao: { cabec: "nfeCabecMsg", corpo: "nfeDadosMsg" },
    NfeStatusServico: { cabec: "nfeCabecMsg", corpo: "nfeDadosMsg" },
  };

  const tags = serviceTags[servico] || { cabec: "nfeCabecMsg", corpo: "nfeDadosMsg" };
  const cleanXml = signedXml.replace(/^<\?xml[^>]*\?>/, "").trim();

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <${tags.cabec} xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${servico}">
      <cUF>${cUf}</cUF>
      <versaoDados>${versaoDados}</versaoDados>
    </${tags.cabec}>
  </soap:Header>
  <soap:Body>
    <${tags.corpo} xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${servico}">
      ${cleanXml}
    </${tags.corpo}>
  </soap:Body>
</soap:Envelope>`;
}

// ============================================
// Conexão HTTPS com certificado A1 (TLS mutuo)
// ============================================

export async function sendSoapRequest(
  endpoint: string,
  soapXml: string,
  certPem: string,
  keyPem: string,
  soapAction: string
): Promise<string> {
  const secureContext = tls.createSecureContext({
    cert: certPem,
    key: keyPem,
  });

  const agent = new https.Agent({
    secureContext,
    minVersion: "TLSv1.2",
    maxVersion: "TLSv1.2",
  });

  const url = new URL(endpoint);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        agent,
        headers: {
          "Content-Type": 'text/xml;charset=utf-8',
          "SOAPAction": soapAction,
          "Content-Length": Buffer.byteLength(soapXml, "utf-8"),
        },
      },
      (res) => {
        // Seguir redirect (302)
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const loc = res.headers.location;
          console.log("[SOAP] Redirect to:", loc);
          if (loc) {
            const redirectUrl = new URL(loc.startsWith("http") ? loc : `${url.protocol}//${url.hostname}${loc}`);
            // Seguir com nova requisição (recursivo simples)
            const httpsMod = require("https");
            const redirectReq = httpsMod.request({
              hostname: redirectUrl.hostname,
              port: 443,
              path: redirectUrl.pathname + redirectUrl.search,
              method: "POST",
              agent,
              headers: {
                "Content-Type": 'text/xml;charset=utf-8',
                "Content-Length": Buffer.byteLength(soapXml, "utf-8"),
              },
            }, (redirectRes: any) => {
              let data = "";
              redirectRes.on("data", (chunk: Buffer) => (data += chunk.toString("utf-8")));
              redirectRes.on("end", () => resolve(data));
            });
            redirectReq.on("error", (err: Error) => reject(err));
            redirectReq.setTimeout(30000);
            redirectReq.write(soapXml, "utf-8");
            redirectReq.end();
            return;
          }
        }
        let data = "";
        console.log("[SOAP] HTTP status:", res.statusCode);
        res.on("data", (chunk: Buffer) => (data += chunk.toString("utf-8")));
        res.on("end", () => {
          console.log("[SOAP] Response body length:", data.length);
          resolve(data);
        });
      }
    );

    req.on("error", (err: Error) =>
      reject(new NfeSoapError("SEFAZ_CONEXAO", `Erro de conexão com SEFAZ: ${err.message}`))
    );
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new NfeSoapError("SEFAZ_TIMEOUT", "Timeout na conexão com SEFAZ"));
    });

    req.write(soapXml, "utf-8");
    req.end();
  });
}

// ============================================
// Parsing de resposta SEFAZ
// ============================================

export function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

export function parseSoapResponse(xml: string): { body: string } {
  // SOAP 1.1 ou 1.2
  const bodyMatch = xml.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/);
  return { body: bodyMatch ? bodyMatch[1].trim() : xml };
}
