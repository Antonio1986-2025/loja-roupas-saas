import prisma from "@/lib/prisma";
import https from "https";
import tls from "tls";

const SEFAZ_AMBIENTE = process.env.SEFAZ_AMBIENTE === "1" ? "1" : "2";

const URLS: Record<string, { producao: string; homologacao: string }> = {
  "50": {
    producao: "https://nfe.sefaz.ms.gov.br/nfe-ws/NfeConsultaProtocolo2",
    homologacao: "https://homnfe.sefaz.ms.gov.br/nfe-ws/NfeConsultaProtocolo2",
  },
};

const UF_CODIGOS: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA",
  "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE",
  "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE",
  "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT",
  "52": "GO", "53": "DF",
};

export class NfeError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "NfeError";
  }
}

interface SefazConfig {
  certificadoA1: string;
  senhaCertificado: string;
}

async function getSefazConfig(tenantId: string): Promise<SefazConfig> {
  const config = await prisma.configuracao.findUnique({ where: { tenantId } });
  if (!config?.certificadoA1 || !config?.senhaCertificado) {
    throw new NfeError("SEM_CERTIFICADO", "Configure o certificado A1 e a senha nas Configurações.");
  }
  return {
    certificadoA1: config.certificadoA1,
    senhaCertificado: config.senhaCertificado,
  };
}

function getEndpoint(uf: string): string {
  const amb = SEFAZ_AMBIENTE === "1" ? "producao" : "homologacao";
  const ufConfig = URLS[uf];
  if (!ufConfig) {
    throw new NfeError("UF_NAO_SUPORTADA", `UF código ${uf} (${UF_CODIGOS[uf] || "?"}) não suportada.`);
  }
  return ufConfig[amb as keyof typeof ufConfig];
}

function buildConsSefazXml(chave: string): string {
  const tpAmb = SEFAZ_AMBIENTE;
  return `<?xml version="1.0" encoding="UTF-8"?>
<consSefaz versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <tpAmb>${tpAmb}</tpAmb>
  <xServ>CONSULTAR</xServ>
  <chNFe>${chave}</chNFe>
</consSefaz>`;
}

function signXml(xml: string, certPem: string, keyPem: string): string {
  const { SignedXml } = require("xml-crypto");

  const sig = new SignedXml();
  sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
  sig.addReference(
    "//*[local-name()='consSefaz']",
    [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    "http://www.w3.org/2001/04/xmlenc#sha256"
  );
  sig.signingKey = keyPem;
  sig.keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certToBase64(certPem)}</X509Certificate></X509Data>`,
  };
  sig.computeSignature(xml);
  return sig.getSignedXml();
}

function certToBase64(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\s/g, "");
}

function buildSoapEnvelope(signedXml: string): string {
  const uf = signedXml.match(/<chNFe>(\d{2})/)?.[1] || "50";
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeConsultaProtocolo2">
      <cUF>${uf}</cUF>
      <versaoDados>4.00</versaoDados>
    </nfeCabecMsg>
  </soap:Header>
  <soap:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeConsultaProtocolo2">
      ${signedXml.replace(/^<\?xml[^>]*\?>/, "").trim()}
    </nfeDadosMsg>
  </soap:Body>
</soap:Envelope>`;
}

type NfeParseResult = {
  cStat: string | null;
  xMotivo: string | null;
  chNFe: string | null;
  nProt: string | null;
  dhRecbto: string | null;
  xml: string;
};

function parseResponse(xml: string): NfeParseResult {
  const extract = (tag: string) => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  };

  const cStat = extract("cStat");
  const xMotivo = extract("xMotivo");

  if (cStat !== "100" && cStat !== "101") {
    throw new NfeError("SEFAZ_ERRO", `SEFAZ: ${xMotivo || `Código ${cStat}`}`);
  }

  const nfe = extract("resNFe") || extract("protNFe") || xml;

  return {
    cStat,
    xMotivo,
    chNFe: extract("chNFe"),
    nProt: extract("nProt"),
    dhRecbto: extract("dhRecbto"),
    xml: nfe,
  };
}

async function sendSoapRequest(endpoint: string, soapXml: string, pfxBase64: string, senha: string): Promise<string> {
  const pfxBuffer = Buffer.from(pfxBase64, "base64");
  const secureContext = tls.createSecureContext({
    pfx: pfxBuffer,
    passphrase: senha,
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
          "Content-Type": 'application/soap+xml;charset=utf-8;action="http://www.portalfiscal.inf.br/nfe/wsdl/NfeConsultaProtocolo2/consulta"',
          "Content-Length": Buffer.byteLength(soapXml, "utf-8"),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString("utf-8")));
        res.on("end", () => resolve(data));
      }
    );

    req.on("error", (err: Error) => reject(new NfeError("SEFAZ_CONEXAO", `Erro de conexão com SEFAZ: ${err.message}`)));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new NfeError("SEFAZ_TIMEOUT", "Timeout na conexão com SEFAZ"));
    });

    req.write(soapXml, "utf-8");
    req.end();
  });
}

export async function consultarNfe(chave: string, tenantId: string) {
  const chaveLimpa = chave.replace(/\D/g, "");
  if (chaveLimpa.length !== 44) {
    throw new NfeError("CHAVE_INVALIDA", "Chave de acesso deve ter 44 dígitos");
  }

  const uf = chaveLimpa.substring(0, 2);
  const config = await getSefazConfig(tenantId);
  const endpoint = getEndpoint(uf);

  const forge = require("node-forge");
  const p12 = forge.pkcs12.pkcs12FromAsn1(
    forge.asn1.fromDer(forge.util.createBuffer(Buffer.from(config.certificadoA1, "base64").toString("binary"))),
    false,
    config.senhaCertificado
  );

  const keyData = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
  const certData = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];

  if (!keyData || !certData) {
    throw new NfeError("CERTIFICADO_INVALIDO", "Não foi possível extrair a chave ou certificado do arquivo PFX.");
  }

  const privateKey = forge.pki.privateKeyToPem(keyData.key);
  const certPem = forge.pki.certificateToPem(certData.cert);

  const consSefazXml = buildConsSefazXml(chaveLimpa);
  const signedXml = signXml(consSefazXml, certPem, privateKey);
  const soapXml = buildSoapEnvelope(signedXml);

  const responseXml = await sendSoapRequest(endpoint, soapXml, config.certificadoA1, config.senhaCertificado);
  return parseResponse(responseXml);
}
