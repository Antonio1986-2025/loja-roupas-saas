import { readFileSync, writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { buildSoapEnvelope, getEndpoint, getSoapAction, extractPfx, sendSoapRequest } from "../src/lib/nfe-soap";

const TENANT_ID = "cmqv85i07000011oi3t1fj698";
const PRISMA_URL = process.env.DATABASE_URL;

async function main() {
  if (!PRISMA_URL) { console.error("DATABASE_URL nao definida"); process.exit(1); }

  const prisma = new PrismaClient({ datasources: { db: { url: PRISMA_URL } } });

  // 1. Carregar certificado A1
  const config = await prisma.configuracao.findUnique({ where: { tenantId: TENANT_ID } });
  if (!config?.certificadoA1 || !config?.senhaCertificado) { console.error("SEM CERTIFICADO"); process.exit(1); }
  const { certPem, keyPem } = extractPfx(config.certificadoA1, config.senhaCertificado);

  // 2. Ler signed XML do arquivo
  const signedXml = readFileSync("scripts/xml-ultimo-envio.xml", "utf-8");

  // 3. Construir SOAP envelope
  const servico = "NfeAutorizacao";
  const cUf = "50";
  const soap = buildSoapEnvelope(signedXml, servico, cUf);
  const wsdlUrl = getEndpoint(cUf, servico, "2");
  const soapAction = getSoapAction(servico);

  writeFileSync("scripts/soap-para-envio.xml", soap, "utf-8");
  console.log("WSDL:", wsdlUrl);
  console.log("Action:", soapAction);

  // 4. Enviar para SEFAZ com TLS mutuo
  console.log("\nEnviando para SEFAZ...");
  const responseXml = await sendSoapRequest(wsdlUrl, soap, certPem, keyPem, soapAction);
  console.log("RESPOSTA SEFAZ:", responseXml.substring(0, 3000));
  writeFileSync("scripts/resposta-sefaz.xml", responseXml, "utf-8");
  console.log("Resposta salva");
}

main().catch(console.error);
