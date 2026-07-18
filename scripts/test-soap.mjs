const signedXml = `<?xml version="1.0" encoding="UTF-8"?>
<enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <idLote>12345</idLote>
  <indSinc>1</indSinc>
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="NFeTESTE">
    <ide>
      <cUF>50</cUF>
      <cNF>12345678</cNF>
    </ide>
  </infNFe>
  </NFe>
</enviNFe>`;

const serviceTags = {
  NfeAutorizacao: { cabec: "nfeCabecMsg", corpo: "nfeDadosMsg" },
};

const tags = serviceTags["NfeAutorizacao"];
const wsdlNome = "NFeAutorizacao4";
const cleanXml = signedXml.replace(/^<\?xml[^>]*\?>/, "").trim();

const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header>
    <${tags.cabec} xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${wsdlNome}">
      <cUF>50</cUF>
      <versaoDados>4.00</versaoDados>
    </${tags.cabec}>
  </soap:Header>
  <soap:Body>
    <${tags.corpo} xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${wsdlNome}>${cleanXml}</${tags.corpo}>
  </soap:Body>
</soap:Envelope>`;

console.log("=== SOAP XML ===");
console.log(soap);
console.log("=== END ===");

require("fs").writeFileSync("scripts/soap-output.xml", soap, "utf-8");
