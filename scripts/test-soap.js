const { buildSoapEnvelope } = require("../src/lib/nfe-soap");

// Simular o conteúdo assinado (com o formato real)
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

const soap = buildSoapEnvelope(signedXml, "NfeAutorizacao", "50", "4.00");
console.log(soap);
