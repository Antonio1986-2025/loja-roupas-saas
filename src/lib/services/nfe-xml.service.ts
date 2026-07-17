// ============================================
// Serviço de geração de XML da NF-e / NFC-e
// Layout enviNFe v4.00 — Simples Nacional (CRT=1)
// UF: Mato Grosso do Sul (cUF=50)
// ============================================

// ============================================
// Tipos
// ============================================

export interface EmitenteData {
  cnpj: string;
  nome: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  regimeTributario?: string; // "SIMPLES_NACIONAL" | "LUCRO_PRESUMIDO" | "LUCRO_REAL"
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string; // "MS"
  cep: string;
  telefone?: string;
  email?: string;
  ibgeCodigoCidade?: string;
}

export interface DestinatarioData {
  cpfCnpj: string;
  nome: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  inscricaoEstadual?: string;
  indIEDest?: number;
}

export interface NfeItemData {
  codigo: string; // código interno
  codigoBarras?: string;
  nome: string;
  ncm?: string;
  cfop?: string;
  cest?: string;
  csosn?: string; // default "102" (Simples Nacional com crédito)
  origem?: number; // 0=nacional
  quantidade: number;
  precoUnitario: number;
  valorTotal: number; // qtd * precoUnitario
  aliquotaICMS?: number; // percentual ICMS (Simples: normalmente 0 ou alíquota do SN)
}

export interface NfeTotalData {
  baseCalculoICMS: number;
  valorICMS: number;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorTotal: number;
}

export interface NfePagamento {
  forma: string; // "01"=dinheiro, "03"=cartão crédito, "04"=débito, "17"=PIX, "10"=crédito loja, "15"=boleto
  valor: number;
  bandeira?: string;
}

export interface NfeEmissaoParams {
  modelo: string; // "55"=NF-e, "65"=NFC-e
  serie: number;
  numero: number;
  cNF: string;
  dataEmissao: Date;
  ambiente: string; // "1"=produção, "2"=homologação
  finalidade: number; // 1=Normal
  naturezaOperacao: string;
  emitente: EmitenteData;
  destinatario: DestinatarioData;
  itens: NfeItemData[];
  totais: NfeTotalData;
  pagamentos: NfePagamento[];
  observacao?: string;
}

// ============================================
// Utilitários
// ============================================

const CODIGO_UF = "50"; // Mato Grosso do Sul

function padLeft(value: string | number, length: number, char: string = "0"): string {
  return String(value).padStart(length, char);
}

function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "").padStart(14, "0");
}

function formatCPF_CNPJ(valor: string): string {
  const limpo = valor.replace(/\D/g, "");
  if (limpo.length <= 11) return limpo.padStart(11, "0");
  return limpo.padStart(14, "0");
}

function formatDateISO(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "-03:00");
}

function formatDecimal(valor: number): string {
  return valor.toFixed(2);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function removeAcentos(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ============================================
// Cálculo do dígito verificador da chave
// ============================================

export function gerarChaveAcesso(params: {
  cUF: string;
  dhEmi: Date;
  cnpj: string;
  modelo: string;
  serie: number;
  nNF: number;
  tpEmis: string;
  cNF: string;
}): string {
  const cUF = padLeft(params.cUF, 2);
  const dhEmi = params.dhEmi.toISOString().slice(2, 4) + params.dhEmi.toISOString().slice(5, 7);
  const cnpj = formatCNPJ(params.cnpj);
  const mod = padLeft(params.modelo, 2);
  const serie = padLeft(params.serie, 3);
  const nNF = padLeft(params.nNF, 9);
  const tpEmis = padLeft(params.tpEmis, 1);
  const cNF = padLeft(params.cNF, 8);

  const chaveSemDV = cUF + dhEmi + cnpj + mod + serie + nNF + tpEmis + cNF;

  // Cálculo DV (módulo 11)
  let soma = 0;
  let peso = 2;
  for (let i = chaveSemDV.length - 1; i >= 0; i--) {
    soma += parseInt(chaveSemDV[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto <= 1 ? 0 : 11 - resto;

  return chaveSemDV + dv;
}

export function gerarCNF(): string {
  let cnf = "";
  for (let i = 0; i < 8; i++) {
    cnf += Math.floor(Math.random() * 10);
  }
  return cnf;
}

// ============================================
// Blocos do XML
// ============================================

function buildIdeTag(params: NfeEmissaoParams): string {
  const dt = params.dataEmissao;
  return `<ide>
    <cUF>${CODIGO_UF}</cUF>
    <cNF>${params.cNF}</cNF>
    <natOp>${escapeXml(params.naturezaOperacao || "Venda de mercadoria")}</natOp>
    <mod>${params.modelo}</mod>
    <serie>${params.serie}</serie>
    <nNF>${params.numero}</nNF>
    <dhEmi>${formatDateISO(dt)}</dhEmi>
    <dhSaiEnt>${formatDateISO(dt)}</dhSaiEnt>
    <tpNF>1</tpNF>
    <idDest>1</idDest>
    <cMunFG>${params.emitente.ibgeCodigoCidade || "5002704"}</cMunFG>
    <tpImp>${params.modelo === "65" ? "5" : "1"}</tpImp>
    <tpEmis>1</tpEmis>
    <cDV>0</cDV>
    <tpAmb>${params.ambiente}</tpAmb>
    <finNFe>${params.finalidade}</finNFe>
    <indFinal>1</indFinal>
    <indPres>1</indPres>
    <procEmi>0</procEmi>
    <verProc>StoriSaaS 1.0</verProc>
  </ide>`;
}

function buildEmitTag(emit: EmitenteData, crt: string): string {
  const ie = emit.inscricaoEstadual
    ? `<IE>${emit.inscricaoEstadual.replace(/\D/g, "")}</IE>`
    : `<IE>ISENTO</IE>`;
  const im = emit.inscricaoMunicipal
    ? `<IM>${emit.inscricaoMunicipal}</IM>`
    : "";
  const fantasia = emit.nomeFantasia ? `<xFant>${escapeXml(removeAcentos(emit.nomeFantasia).slice(0, 60))}</xFant>` : "";

  return `<emit>
    <CNPJ>${formatCNPJ(emit.cnpj)}</CNPJ>
    <xNome>${escapeXml(removeAcentos(emit.nome).slice(0, 60))}</xNome>
    ${fantasia}
    <enderEmit>
      <xLgr>${escapeXml(removeAcentos(emit.endereco).slice(0, 60))}</xLgr>
      <nro>${escapeXml((emit.numero || "S/N").slice(0, 60))}</nro>
      <xBairro>${escapeXml(removeAcentos(emit.bairro || "Centro").slice(0, 60))}</xBairro>
      <cMun>${emit.ibgeCodigoCidade || "5002704"}</cMun>
      <xMun>${escapeXml(removeAcentos(emit.cidade || "Campo Grande").slice(0, 60))}</xMun>
      <UF>${emit.estado || "MS"}</UF>
      <CEP>${(emit.cep || "00000000").replace(/\D/g, "")}</CEP>
      <cPais>1058</cPais>
      <xPais>BRASIL</xPais>
      <fone>${(emit.telefone || "").replace(/\D/g, "").slice(0, 14)}</fone>
    </enderEmit>
    ${ie}
    ${im}
    <CRT>${crt}</CRT>
  </emit>`;
}

function buildDestTag(dest: DestinatarioData): string {
  const isCNPJ = dest.cpfCnpj.replace(/\D/g, "").length > 11;
  const docTag = isCNPJ
    ? `<CNPJ>${formatCPF_CNPJ(dest.cpfCnpj)}</CNPJ>`
    : `<CPF>${formatCPF_CNPJ(dest.cpfCnpj)}</CPF>`;

  const ieTag = dest.inscricaoEstadual
    ? `<IE>${dest.inscricaoEstadual.replace(/\D/g, "")}</IE>`
    : "";

  const indIE = dest.indIEDest !== undefined ? dest.indIEDest : 9;

  let enderDest = "";
  if (dest.endereco) {
    enderDest = `<enderDest>
      <xLgr>${escapeXml(removeAcentos(dest.endereco).slice(0, 60))}</xLgr>
      <nro>${escapeXml((dest.numero || "S/N").slice(0, 60))}</nro>
      <xBairro>${escapeXml(removeAcentos(dest.bairro || "Centro").slice(0, 60))}</xBairro>
      <cMun>5002704</cMun>
      <xMun>${escapeXml(removeAcentos(dest.cidade || "Campo Grande").slice(0, 60))}</xMun>
      <UF>${dest.estado || "MS"}</UF>
      <CEP>${(dest.cep || "00000000").replace(/\D/g, "")}</CEP>
      <cPais>1058</cPais>
      <xPais>BRASIL</xPais>
    </enderDest>`;
  }

  return `<dest>
    ${docTag}
    <xNome>${escapeXml(removeAcentos(dest.nome).slice(0, 60))}</xNome>
    ${enderDest}
    <indIEDest>${indIE}</indIEDest>
    ${ieTag}
    <email>${escapeXml(dest.email || "")}</email>
  </dest>`;
}

function buildProdTag(item: NfeItemData): string {
  const cEAN = item.codigoBarras ? `<cEAN>${item.codigoBarras.replace(/\D/g, "").slice(0, 14)}</cEAN>` : `<cEAN>SEM GTIN</cEAN>`;
  const ncm = item.ncm ? `<NCM>${item.ncm.replace(/\D/g, "")}</NCM>` : `<NCM>62046200</NCM>`;
  const cest = item.cest ? `<CEST>${item.cest.replace(/\D/g, "")}</CEST>` : "";
  const cfop = item.cfop || "5102";

  return `<prod>
      <cProd>${escapeXml(item.codigo.slice(0, 60))}</cProd>
      ${cEAN}
      <xProd>${escapeXml(removeAcentos(item.nome).slice(0, 120))}</xProd>
      ${ncm}
      ${cest}
      <CFOP>${cfop}</CFOP>
      <uCom>UN</uCom>
      <qCom>${formatDecimal(item.quantidade)}</qCom>
      <vUnCom>${formatDecimal(item.precoUnitario)}</vUnCom>
      <vProd>${formatDecimal(item.valorTotal)}</vProd>
      <cEANTrib>SEM GTIN</cEANTrib>
      <uTrib>UN</uTrib>
      <qTrib>${formatDecimal(item.quantidade)}</qTrib>
      <vUnTrib>${formatDecimal(item.precoUnitario)}</vUnTrib>
      <indTot>1</indTot>
    </prod>`;
}

function buildImpostoTag(item: NfeItemData): string {
  const csosn = item.csosn || "102";
  const origem = item.origem !== undefined ? item.origem : 0;
  const pCredSN = 2.60; // alíquota crédito Simples Nacional 2024
  const vCredICMSSN = item.valorTotal * (pCredSN / 100);

  // PIS e COFINS para Simples: CST 49 (outras operações - sem débito/crédito)
  return `<imposto>
    <vTotTrib>${formatDecimal(item.valorTotal * 0.026)}</vTotTrib>
    <ICMS>
      <ICMSSN102>
        <orig>${origem}</orig>
        <CSOSN>${csosn}</CSOSN>
        <pCredSN>${formatDecimal(pCredSN)}</pCredSN>
        <vCredICMSSN>${formatDecimal(vCredICMSSN)}</vCredICMSSN>
      </ICMSSN102>
    </ICMS>
    <PIS>
      <PISOutr>
        <CST>49</CST>
        <vBC>${formatDecimal(item.valorTotal)}</vBC>
        <pPIS>0.00</pPIS>
        <vPIS>0.00</vPIS>
      </PISOutr>
    </PIS>
    <COFINS>
      <COFINSOutr>
        <CST>49</CST>
        <vBC>${formatDecimal(item.valorTotal)}</vBC>
        <pCOFINS>0.00</pCOFINS>
        <vCOFINS>0.00</vCOFINS>
      </COFINSOutr>
    </COFINS>
  </imposto>`;
}

function buildDetTag(item: NfeItemData, nItem: number): string {
  return `<det nItem="${nItem}">
    ${buildProdTag(item)}
    ${buildImpostoTag(item)}
  </det>`;
}

function buildTotalTag(totais: NfeTotalData): string {
  return `<total>
    <ICMSTot>
      <vBC>${formatDecimal(totais.baseCalculoICMS)}</vBC>
      <vICMS>${formatDecimal(totais.valorICMS)}</vICMS>
      <vICMSDeson>0.00</vICMSDeson>
      <vBCST>0.00</vBCST>
      <vST>0.00</vST>
      <vProd>${formatDecimal(totais.valorProdutos)}</vProd>
      <vFrete>${formatDecimal(totais.valorFrete)}</vFrete>
      <vSeg>${formatDecimal(totais.valorSeguro)}</vSeg>
      <vDesc>${formatDecimal(totais.valorDesconto)}</vDesc>
      <vII>0.00</vII>
      <vIPI>0.00</vIPI>
      <vPIS>0.00</vPIS>
      <vCOFINS>0.00</vCOFINS>
      <vOutro>0.00</vOutro>
      <vNF>${formatDecimal(totais.valorTotal)}</vNF>
      <vTotTrib>${formatDecimal(totais.valorTotal * 0.026)}</vTotTrib>
    </ICMSTot>
  </total>`;
}

function buildTranspTag(): string {
  return `<transp>
    <modFrete>9</modFrete>
  </transp>`;
}

function buildPagTag(pagamentos: NfePagamento[]): string {
  const detPag = pagamentos.map((p) => {
    const tPag = p.forma;
    const bandeira = p.bandeira
      ? `<card>
        <tpIntegra>1</tpIntegra>
        <CNPJ>00000000000000</CNPJ>
        <tBand>${escapeXml(p.bandeira)}</tBand>
        <cAut>000000</cAut>
      </card>`
      : "";
    return `<detPag>
      <indPag>0</indPag>
      <tPag>${tPag}</tPag>
      <vPag>${formatDecimal(p.valor)}</vPag>
      ${bandeira}
    </detPag>`;
  }).join("\n");

  return `<pag>
    ${detPag}
  </pag>`;
}

function buildInfAdicTag(observacao?: string): string {
  return `<infAdic>
    <infCpl>${escapeXml(observacao || "Venda realizada no estabelecimento").slice(0, 5000)}</infCpl>
  </infAdic>`;
}

// ============================================
// Função principal: montar <infNFe>
// ============================================

export function buildInfNFe(params: NfeEmissaoParams, chaveAcesso: string): string {
  const crt = params.emitente.regimeTributario === "LUCRO_PRESUMIDO" ? "2"
    : params.emitente.regimeTributario === "LUCRO_REAL" ? "3"
    : "1"; // Simples Nacional

  const dets = params.itens.map((item, i) => buildDetTag(item, i + 1)).join("\n");

  return `<infNFe versao="4.00" Id="NFe${chaveAcesso}">
  ${buildIdeTag(params)}
  ${buildEmitTag(params.emitente, crt)}
  ${buildDestTag(params.destinatario)}
  ${dets}
  ${buildTotalTag(params.totais)}
  ${buildTranspTag()}
  ${buildPagTag(params.pagamentos)}
  ${buildInfAdicTag(params.observacao)}
</infNFe>`;
}

// ============================================
// Montar <NFe> completo
// ============================================

export function buildNFeXml(params: NfeEmissaoParams, chaveAcesso: string): string {
  const infNFe = buildInfNFe(params, chaveAcesso);

  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  ${infNFe}
</NFe>`;
}

// ============================================
// Envelopar em <enviNFe> para envio
// ============================================

export function buildEnviNFe(
  nfeXml: string,
  idLote: string,
  indSinc: string = "1" // 1=síncrono
): string {
  const cleanXml = nfeXml.replace(/^<\?xml[^>]*\?>/, "").trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <idLote>${idLote}</idLote>
  <indSinc>${indSinc}</indSinc>
  ${cleanXml}
</enviNFe>`;
}

// ============================================
// Converter forma de pagamento da loja → código NF-e
// ============================================

const FORMA_PAGAMENTO_MAP: Record<string, string> = {
  DINHEIRO: "01",
  CREDITO: "03",
  DEBITO: "04",
  PIX: "17",
  CREDITO_LOJA: "10",
  BOLETO: "15",
  DUPLICATA: "15",
};

export function mapFormaPagamento(lojaForma: string): string {
  return FORMA_PAGAMENTO_MAP[lojaForma] || "01";
}
