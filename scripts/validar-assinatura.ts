const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { extractPfx } = require("../src/lib/nfe-soap");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const VENDA_ID = "cmrpbo7ok00r3a26t7wymc8ia";

  // Pegar a última nota fiscal registrada
  const nota = await prisma.notaFiscal.findFirst({
    where: { vendaId: VENDA_ID },
    orderBy: { dataEmissao: "desc" },
  });
  if (!nota) { console.log("NOTA NAO ENCONTRADA"); return; }

  const xmlEnvio = nota.xmlEnvio;

  // Extrair o certificado
  const config = await prisma.configuracao.findUnique({ where: { tenantId: nota.tenantId } });
  if (!config?.certificadoA1 || !config?.senhaCertificado) {
    console.log("SEM CERTIFICADO"); return;
  }
  const { certPem } = extractPfx(config.certificadoA1, config.senhaCertificado);

  // Remover o namespace do Signature (xml-crypto não lida bem com xmlns em certos casos)
  const xmlParaVerificar = xmlEnvio;

  // Validar com xml-crypto
  const { SignedXml } = require("xml-crypto");
  const sig = new SignedXml();
  sig.publicCert = certPem;
  try {
    sig.loadSignature(xmlParaVerificar);
    const res = sig.checkSignature(xmlParaVerificar);
    console.log("Signature valid (local):", res);
    if (!res) {
      console.log("Validation errors:", sig.validationErrors);
    }
  } catch (e) {
    console.log("Erro validando:", e.message);
  }

  // Salvar XML em arquivo para inspecao
  fs.writeFileSync("scripts/xml-ultimo-envio.xml", xmlEnvio, "utf-8");
  console.log("XML salvo em scripts/xml-ultimo-envio.xml");
  console.log("Tamanho:", xmlEnvio.length);
}

main().catch(console.error);
