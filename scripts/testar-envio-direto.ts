import { readFileSync, writeFileSync } from "fs";
import {
  buildSoapEnvelope,
  getEndpoint,
  getSoapAction,
  extractPfx,
  sendSoapRequest,
} from "../src/lib/nfe-soap";

async function main() {
  const signedXmlPath = "scripts/xml-ultimo-envio.xml";
  const signedXml = readFileSync(signedXmlPath, "utf-8");

  const servico = "NfeAutorizacao";
  const cUf = "50";
  const soap = buildSoapEnvelope(signedXml, servico, cUf);
  const wsdlUrl = getEndpoint(cUf, servico, "2");
  const soapAction = getSoapAction(servico);

  writeFileSync("scripts/soap-para-envio.xml", soap, "utf-8");
  console.log("=== WSDL URL ===");
  console.log(wsdlUrl);
  console.log("=== SOAP Action ===");
  console.log(soapAction);
  console.log("=== SOAP (first 500 chars) ===");
  console.log(soap.substring(0, 500));
  console.log("=== SOAP (last 500 chars) ===");
  console.log(soap.substring(soap.length - 500));

  // Precisamos do certificado para enviar (TLS mútuo)
  // O xml-ultimo-envio.xml já foi assinado, mas o sendSoapRequest precisa do
  // certificado para a conexão TLS com a SEFAZ.
  // Vamos carregar o certificado do arquivo local salvo anteriormente,
  // ou pedir para ler direto do banco.
  // Por ora, usamos NODE_TLS_REJECT_UNAUTHORIZED=0 com fetch simples:
  console.log("\n=== Enviando para SEFAZ... ===");

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const response = await fetch(wsdlUrl, {
    method: "POST",
    headers: {
      "Content-Type": `application/soap+xml;charset=utf-8;action="${soapAction}"`,
    },
    body: soap,
  });

  console.log("Status:", response.status);
  const responseText = await response.text();
  console.log("Resposta (primeiros 3000 chars):", responseText.substring(0, 3000));

  writeFileSync("scripts/resposta-sefaz.xml", responseText, "utf-8");
  console.log("\nResposta salva em scripts/resposta-sefaz.xml");
}

main().catch(console.error);
