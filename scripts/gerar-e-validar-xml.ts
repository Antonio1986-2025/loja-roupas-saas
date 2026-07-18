const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { extractPfx, signXml } = require("../src/lib/nfe-soap");
const {
  buildNFeXml,
  buildEnviNFe,
  buildInfNFe,
} = require("../src/lib/services/nfe-xml.service");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

function gerarChave(
  cUf: string,
  anoMes: string,
  cnpj: string,
  modelo: string,
  serie: number,
  nNF: number,
  tpEmis: string,
  cNF: string
): string {
  return `${cUf}${anoMes}${cnpj}${modelo}${String(serie).padStart(3, "0")}${String(nNF).padStart(9, "0")}${tpEmis}${cNF}0`;
}

async function main() {
  const TENANT_ID = "cmqv85i07000011oi3t1fj698";
  const VENDA_ID = "cmrpbo7ok00r3a26t7wymc8ia";

  // Buscar certificado
  const config = await prisma.configuracao.findUnique({ where: { tenantId: TENANT_ID } });
  if (!config?.certificadoA1 || !config?.senhaCertificado) {
    console.log("SEM CERTIFICADO"); return;
  }
  const { certPem, keyPem } = extractPfx(config.certificadoA1, config.senhaCertificado);

  // Buscar venda com itens e cliente
  const venda = await prisma.venda.findUnique({
    where: { id: VENDA_ID },
    include: {
      itens: { include: { variante: true } },
      cliente: true,
    },
  });
  if (!venda) { console.log("VENDA NAO ENCONTRADA"); return; }

  // Build params - simplified
  const params = {
    modelo: "55",
    serie: 1,
    numero: 4,
    cNF: String(Math.floor(Math.random() * 100000000)).padStart(8, "0"),
    dataEmissao: new Date(),
    ambiente: "2",
    finalidade: 1,
    naturezaOperacao: "Venda de mercadoria",
    emitente: {
      cnpj: "65596054000107",
      nome: "California Store",
      regimeTributario: "SIMPLES_NACIONAL",
      endereco: "10 Av Virginia Ferreira, 500, Sala 02 - Flavio Garcia",
      numero: "S/N",
      bairro: "Centro",
      cidade: "Coxim",
      estado: "MS",
      cep: "79400000",
      telefone: "6796517613",
      ibgeCodigoCidade: "5002704",
    },
    destinatario: {
      cpfCnpj: venda.cliente?.cpfCnpj || "07202757176",
      nome: venda.cliente?.nome || "BERENICE BEZERRA",
      endereco: venda.cliente?.endereco || "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "MS",
      cep: "",
      indIEDest: 9,
      ibgeCodigoCidade: "5003702",
    },
    itens: venda.itens.map((item) => ({
      codigo: item.variante?.codigo || item.varianteId,
      nome: item.variante?.nome || "Produto",
      ncm: "62046200",
      cfop: "5102",
      csosn: "102",
      origem: 0,
      quantidade: item.quantidade,
      precoUnitario: Number(item.precoUnitario),
      valorTotal: Number(item.valorTotal),
      codigoBarras: item.variante?.codigoBarras || undefined,
    })),
    totais: {
      baseCalculoICMS: 275.56,
      valorICMS: 0,
      valorProdutos: 275.56,
      valorFrete: 0,
      valorSeguro: 0,
      valorDesconto: 0,
      valorTotal: 275.56,
    },
    pagamentos: [{ forma: "03", valor: 275.56 }],
    observacao: "Venda #158",
  };

  const chaveAcesso = gerarChave(
    "50",
    new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7),
    "65596054000107",
    "55",
    1,
    4,
    "1",
    params.cNF
  );

  const idLote = String(Math.floor(Math.random() * 1000000000));

  // Fluxo: buildNFeXml -> buildEnviNFe (minifica) -> signXml
  const nfeXmlCompleto = buildNFeXml(params, chaveAcesso);
  const enviNFe = buildEnviNFe(nfeXmlCompleto, idLote, "1");

  console.log("enviNFe length:", enviNFe.length);
  console.log("enviNFe starts with:", enviNFe.substring(0, 100));

  const signedXml = signXml(
    enviNFe,
    certPem,
    keyPem,
    `//*[@Id='NFe${chaveAcesso}']`,
    `#NFe${chaveAcesso}`,
    "NFe",
    "nfe"
  );

  console.log("signedXml length:", signedXml.length);
  console.log("signedXml starts with:", signedXml.substring(0, 100));

  // Salvar para validacao
  fs.writeFileSync("scripts/xml-gerado-para-envio.xml", signedXml, "utf-8");
  console.log("XML salvo em scripts/xml-gerado-para-envio.xml");

  // Validar com xml-crypto no Node.js
  const { SignedXml } = require("xml-crypto");
  try {
    const sig = new SignedXml();
    sig.publicCert = certPem;
    sig.loadSignature(signedXml);
    const res = sig.checkSignature(signedXml);
    console.log("xml-crypto valid:", res);
    if (!res) {
      console.log("Validation errors:", sig.validationErrors);
    }
  } catch (e) {
    console.log("xml-crypto error:", e.message);
  }
}

main().catch(console.error);
