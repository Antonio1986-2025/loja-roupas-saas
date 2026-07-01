export type NFeParseResult = {
  chaveAcesso: string;
  numeroNFe: string;
  serieNFe: number;
  dataEmissao: string;
  cfop: string;
  naturezaOperacao: string;
  fornecedorCNPJ: string;
  fornecedorNome: string;
  valorFrete: number;
  valorSeguro: number;
  valorDespesas: number;
  valorDesconto: number;
  valorICMS: number;
  valorPIS: number;
  valorCOFINS: number;
  valorIPI: number;
  valorProdutos: number;
  valorTotal: number;
  itens: NFeItem[];
  parcelas: NFeParcela[];
};

export type NFeItem = {
  nItem: number;
  codigoProduto: string;
  codigoBarras: string;
  nome: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorICMS: number;
  valorPIS: number;
  valorCOFINS: number;
};

export type NFeParcela = {
  numero: string;
  valor: number;
  vencimento: string;
};

export function parseNFeXml(xmlContent: string): NFeParseResult {
  const getTag = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? match[1].trim() : "";
  };

  const getTagNS = (xml: string, localName: string): string => {
    const match = xml.match(new RegExp(`<[^:]*:${localName}[^>]*>([^<]*)<`));
    if (match) return match[1].trim();
    const match2 = xml.match(new RegExp(`<${localName}>([^<]*)</${localName}>`));
    return match2 ? match2[1].trim() : "";
  };

  const getAllTags = (xml: string, tag: string): string[] => {
    const results: string[] = [];
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
    let match;
    while ((match = regex.exec(xml)) !== null) {
      results.push(match[1].trim());
    }
    return results;
  };

  const getBlocks = (xml: string, blockTag: string): string[] => {
    const results: string[] = [];
    const regex = new RegExp(`<${blockTag}[^>]*>([\\s\\S]*?)</${blockTag}>`, "g");
    let match;
    while ((match = regex.exec(xml)) !== null) {
      results.push(match[0]);
    }
    return results;
  };

  const getDetBlocks = (xml: string): string[] => {
    const results: string[] = [];
    const regex = /<det[^>]*>([\s\S]*?)<\/det>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      results.push(match[0]);
    }
    return results;
  };

  const getDupBlocks = (xml: string): string[] => {
    const results: string[] = [];
    const regex = /<dup>([\s\S]*?)<\/dup>/g;
    let match;
    while ((match = regex.exec(xml))) {
      results.push(match[0]);
    }
    return results;
  };

  const infNFe = xmlContent.match(/<infNFe[^>]*>([\s\S]*?)<\/infNFe>/);
  const nfeBody = infNFe ? infNFe[0] : xmlContent;

  const emitBlock = nfeBody.match(/<emit>([\s\S]*?)<\/emit>/);
  const emitXml = emitBlock ? emitBlock[0] : "";

  const totalBlock = nfeBody.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/);
  const totalXml = totalBlock ? totalBlock[0] : "";

  const cobrBlock = nfeBody.match(/<cobr>([\s\S]*?)<\/cobr>/);
  const cobrXml = cobrBlock ? cobrBlock[0] : "";

  const dets = getDetBlocks(nfeBody);
  const dups = getDupBlocks(cobrXml);

  const chaveAcesso = getTagNS(xmlContent, "chNFe") || "";

  const ideBlock = nfeBody.match(/<ide>([\s\S]*?)<\/ide>/);
  const ideXml = ideBlock ? ideBlock[0] : "";

  const numeroNFe = getTag(ideXml, "nNF");
  const serieStr = getTag(ideXml, "serie");
  const dhEmi = getTag(ideXml, "dhEmi") || getTag(ideXml, "dhEmi");
  const natOp = getTag(ideXml, "natOp");

  const itens: NFeItem[] = dets.map((detXml) => {
    const prodXml = detXml.match(/<prod>([\s\S]*?)<\/prod>/);
    const prod = prodXml ? prodXml[0] : "";
    const impostoXml = detXml.match(/<imposto>([\s\S]*?)<\/imposto>/);
    const imp = impostoXml ? impostoXml[0] : "";

    const itemTag = detXml.match(/<det\s+nItem=["']?(\d+)["'\s>]/);
    const nItem = itemTag ? parseInt(itemTag[1]) : 0;

    const icmsMatch = imp.match(/<vICMS>([^<]*)<\/vICMS>/);
    const pisMatch = imp.match(/<vPIS>([^<]*)<\/vPIS>/);
    const cofinsMatch = imp.match(/<vCOFINS>([^<]*)<\/vCOFINS>/);

    let nome = getTag(prod, "xProd");
    const codigoBarras = getTag(prod, "cEAN");
    if (codigoBarras && nome.endsWith(codigoBarras)) {
      nome = nome.slice(0, -codigoBarras.length).trimEnd();
    }

    return {
      nItem,
      codigoProduto: getTag(prod, "cProd"),
      codigoBarras: codigoBarras || "",
      nome,
      ncm: getTag(prod, "NCM"),
      cfop: getTag(prod, "CFOP"),
      quantidade: parseFloat(getTag(prod, "qCom") || "0"),
      valorUnitario: parseFloat(getTag(prod, "vUnCom") || "0"),
      valorTotal: parseFloat(getTag(prod, "vProd") || "0"),
      valorICMS: icmsMatch ? parseFloat(icmsMatch[1]) : 0,
      valorPIS: pisMatch ? parseFloat(pisMatch[1]) : 0,
      valorCOFINS: cofinsMatch ? parseFloat(cofinsMatch[1]) : 0,
    };
  });

  const cfop = itens.length > 0 ? itens[0].cfop : "";

  const parcelas: NFeParcela[] = dups.map((dupXml) => ({
    numero: getTag(dupXml, "nDup"),
    valor: parseFloat(getTag(dupXml, "vDup") || "0"),
    vencimento: getTag(dupXml, "dVenc"),
  }));

  return {
    chaveAcesso,
    numeroNFe,
    serieNFe: parseInt(serieStr || "0"),
    dataEmissao: dhEmi,
    cfop,
    naturezaOperacao: natOp,
    fornecedorCNPJ: getTag(emitXml, "CNPJ"),
    fornecedorNome: getTag(emitXml, "xNome"),
    valorFrete: parseFloat(getTag(totalXml, "vFrete") || "0"),
    valorSeguro: parseFloat(getTag(totalXml, "vSeg") || "0"),
    valorDespesas: parseFloat(getTag(totalXml, "vOutro") || "0"),
    valorDesconto: parseFloat(getTag(totalXml, "vDesc") || "0"),
    valorICMS: parseFloat(getTag(totalXml, "vICMS") || "0"),
    valorPIS: parseFloat(getTag(totalXml, "vPIS") || "0"),
    valorCOFINS: parseFloat(getTag(totalXml, "vCOFINS") || "0"),
    valorIPI: parseFloat(getTag(totalXml, "vIPI") || "0"),
    valorProdutos: parseFloat(getTag(totalXml, "vProd") || "0"),
    valorTotal: parseFloat(getTag(totalXml, "vNF") || "0"),
    itens,
    parcelas,
  };
}
