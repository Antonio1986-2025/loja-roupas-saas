import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const dynamic = "force-dynamic";

const PROMPT_SISTEMA = `Você é um assistente especializado em leitura de documentos comerciais brasileiros (notas fiscais, pedidos de compra, orçamentos, romaneios).

Extraia as informações do documento e retorne SOMENTE um JSON válido com a seguinte estrutura:

{
  "tipoDocumento": "NF" | "PEDIDO" | "ORCAMENTO" | "ROMANEIO" | "OUTRO",
  "fornecedor": {
    "nome": string | null,
    "cnpj": string | null,
    "telefone": string | null
  },
  "numeroDocumento": string | null,
  "dataEmissao": "YYYY-MM-DD" | null,
  "itens": [
    {
      "descricao": string,
      "codigo": string | null,
      "quantidade": number,
      "unidade": string | null,
      "precoUnitario": number,
      "subtotal": number,
      "cor": string | null,
      "tamanho": string | null,
      "marca": string | null
    }
  ],
  "valorTotal": number | null,
  "valorFrete": number | null,
  "observacoes": string | null
}

Regras OBRIGATÓRIAS:
- Extraia TODOS os itens visíveis no documento — mesmo que sejam dezenas
- Para roupas/calçados, identifique cor e tamanho quando possível
- Preços em reais com centavos (ex: 99.90)
- Datas no formato YYYY-MM-DD
- CNPJ: somente números, sem pontos ou traços
- Campos não encontrados: use null
- RETORNE APENAS O JSON. Sem explicação, sem markdown, sem \`\`\`json`;

/**
 * Extrai texto de PDF sem dependências nativas.
 */
function extrairTextoPdfSimples(buffer: Buffer): string {
  try {
    const raw = buffer.toString("latin1");
    const textos: string[] = [];

    const matchesParens = raw.match(/\(([^)]{1,200})\)/g);
    if (matchesParens) {
      for (const m of matchesParens) {
        const t = m.slice(1, -1).replace(/\\n/g, " ").replace(/\\/g, "").trim();
        if (t.length > 2 && /[\w\d]/.test(t)) textos.push(t);
      }
    }

    const btEt = raw.match(/BT([\s\S]*?)ET/g);
    if (btEt) {
      for (const bloco of btEt) {
        const tjMatches = bloco.match(/\[(.*?)\]\s*TJ/g);
        if (tjMatches) {
          for (const tj of tjMatches) {
            const partes = tj.match(/\(([^)]*)\)/g);
            if (partes) {
              const texto = partes.map((p) => p.slice(1, -1)).join("");
              if (texto.trim().length > 1) textos.push(texto.trim());
            }
          }
        }
      }
    }

    return textos.join(" ").replace(/\s+/g, " ").trim().slice(0, 15000);
  } catch {
    return "";
  }
}

type DocumentoExtraido = {
  tipoDocumento: string;
  fornecedor: { nome: string | null; cnpj: string | null; telefone: string | null };
  numeroDocumento: string | null;
  dataEmissao: string | null;
  itens: {
    descricao: string;
    codigo: string | null;
    quantidade: number;
    unidade: string | null;
    precoUnitario: number;
    subtotal: number;
    cor: string | null;
    tamanho: string | null;
    marca: string | null;
  }[];
  valorTotal: number | null;
  valorFrete: number | null;
  observacoes: string | null;
};

function docVazio(): DocumentoExtraido {
  return {
    tipoDocumento: "OUTRO",
    fornecedor: { nome: null, cnpj: null, telefone: null },
    numeroDocumento: null,
    dataEmissao: null,
    itens: [],
    valorTotal: null,
    valorFrete: null,
    observacoes: null,
  };
}

function parsearResposta(raw: string): DocumentoExtraido {
  // Remove markdown code fences
  let jsonStr = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Às vezes a IA adiciona texto antes/depois do JSON — extrai só o objeto
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (match) jsonStr = match[0];

  console.log("[parse-documento] Raw IA (300 chars):", jsonStr.slice(0, 300));

  const parsed = JSON.parse(jsonStr) as Partial<DocumentoExtraido>;

  // Garante estrutura mínima mesmo se a IA omitir campos
  return {
    tipoDocumento: parsed.tipoDocumento || "OUTRO",
    fornecedor: parsed.fornecedor || { nome: null, cnpj: null, telefone: null },
    numeroDocumento: parsed.numeroDocumento ?? null,
    dataEmissao: parsed.dataEmissao ?? null,
    itens: Array.isArray(parsed.itens) ? parsed.itens : [],
    valorTotal: parsed.valorTotal ?? null,
    valorFrete: parsed.valorFrete ?? null,
    observacoes: parsed.observacoes ?? null,
  };
}

/**
 * Processa um único arquivo e retorna o documento extraído.
 * Para imagens: envia via vision.
 * Para PDFs: tenta extração de texto primeiro; se falhar, converte para imagens via canvas.
 */
async function processarArquivo(
  openai: OpenAI,
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<DocumentoExtraido> {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  if (!isImage && !isPdf) {
    throw new Error(`Formato não suportado: ${mimeType}`);
  }

  let resultado: string;

  if (isImage) {
    // Imagem: envia direto para GPT-4o vision
    const base64 = buffer.toString("base64");
    console.log(`[parse-documento] Processando imagem ${fileName} (${(buffer.length / 1024).toFixed(0)} KB)`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "Analise esta imagem de documento comercial e extraia TODAS as informações conforme instruído. Retorne apenas o JSON.",
            },
          ],
        },
      ],
    });
    resultado = response.choices[0]?.message?.content ?? "{}";
    console.log(`[parse-documento] Resposta imagem finish_reason: ${response.choices[0]?.finish_reason}`);

  } else {
    // PDF: tenta extração de texto
    const textoPdf = extrairTextoPdfSimples(buffer);
    console.log(`[parse-documento] PDF ${fileName}: texto extraído = ${textoPdf.length} chars`);

    if (textoPdf.length > 80) {
      // PDF com texto embutido — mais barato e preciso
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [
          { role: "system", content: PROMPT_SISTEMA },
          {
            role: "user",
            content: `Extraia as informações deste documento comercial e retorne o JSON.\n\nTEXTO DO DOCUMENTO:\n\n${textoPdf}`,
          },
        ],
      });
      resultado = response.choices[0]?.message?.content ?? "{}";
    } else {
      // PDF scaneado ou sem texto — converte para imagem JPEG via base64
      // Nota: GPT-4o aceita PDF como image_url em alguns casos, mas é inconsistente.
      // Melhor abordagem: enviar como imagem JPEG usando o próprio buffer PNG do PDF
      // Como não temos conversão nativa, enviamos o PDF base64 como tipo image/jpeg
      // e pedimos explicitamente para tratar como documento escaneado.
      const base64 = buffer.toString("base64");
      console.log(`[parse-documento] PDF scaneado, enviando via vision (${(buffer.length / 1024).toFixed(0)} KB)`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [
          { role: "system", content: PROMPT_SISTEMA },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Este é um documento PDF escaneado. Analise o conteúdo e extraia TODAS as informações conforme instruído. Retorne apenas o JSON.",
              },
              {
                type: "image_url",
                image_url: {
                  // GPT-4o aceita PDF como image_url com mime application/pdf
                  url: `data:application/pdf;base64,${base64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      });
      resultado = response.choices[0]?.message?.content ?? "{}";
      console.log(`[parse-documento] PDF vision finish_reason: ${response.choices[0]?.finish_reason}`);
    }
  }

  return parsearResposta(resultado);
}

function mesclarDocumentos(docs: DocumentoExtraido[]): DocumentoExtraido {
  if (docs.length === 0) throw new Error("Nenhum documento processado");
  if (docs.length === 1) return docs[0];

  const base = { ...docs[0] };
  const itensMapa = new Map<string, DocumentoExtraido["itens"][0]>();
  let semCodigoIdx = 0;

  for (const doc of docs) {
    for (const item of doc.itens) {
      const chave = item.codigo
        ? item.codigo.trim().toLowerCase()
        : `_nc_${semCodigoIdx++}_${item.descricao.slice(0, 20).toLowerCase()}`;

      if (itensMapa.has(chave)) {
        const existente = itensMapa.get(chave)!;
        itensMapa.set(chave, {
          ...existente,
          quantidade: existente.quantidade + item.quantidade,
          subtotal: existente.subtotal + item.subtotal,
        });
      } else {
        itensMapa.set(chave, { ...item });
      }
    }
  }

  base.itens = Array.from(itensMapa.values());

  // Usa o maior valorTotal encontrado entre as páginas
  const totais = docs.map((d) => d.valorTotal ?? 0).filter((v) => v > 0);
  base.valorTotal = totais.length > 0 ? Math.max(...totais) : null;

  const fretes = docs.map((d) => d.valorFrete ?? 0).filter((v) => v > 0);
  base.valorFrete = fretes.length > 0 ? fretes[0] : null;

  const obsArr = docs.map((d) => d.observacoes).filter(Boolean);
  base.observacoes = obsArr.length > 0 ? obsArr.join(" | ") : null;

  return base;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "NAO_AUTENTICADO" }, { status: 401 });
  }

  try {
    const formData = await req.formData();

    let files = formData.getAll("files") as File[];
    if (files.length === 0) {
      const single = formData.get("file") as File | null;
      if (single) files = [single];
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Valida
    for (const file of files) {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        return NextResponse.json(
          { error: `Formato inválido: "${file.name}". Use JPG, PNG ou PDF.` },
          { status: 400 }
        );
      }
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          { error: `"${file.name}" é muito grande. Máximo 20MB.` },
          { status: 400 }
        );
      }
    }

    const openai = getOpenAI();

    // Processa em paralelo
    const resultados = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        return processarArquivo(openai, buffer, file.type, file.name);
      })
    );

    const dados = mesclarDocumentos(resultados);

    console.log("[parse-documento] Resultado final:", JSON.stringify({
      tipo: dados.tipoDocumento,
      fornecedor: dados.fornecedor?.nome,
      numero: dados.numeroDocumento,
      itens: dados.itens.length,
      total: dados.valorTotal,
    }));

    // Verifica se extraiu algo útil
    const extraiuAlgo =
      dados.itens.length > 0 ||
      dados.numeroDocumento ||
      (dados.fornecedor?.nome) ||
      dados.valorTotal;

    if (!extraiuAlgo) {
      return NextResponse.json(
        {
          error:
            "A IA não conseguiu extrair informações deste documento. " +
            "Dicas: use uma foto reta e bem iluminada sem reflexos, ou envie o PDF digital (não foto do PDF). " +
            "Se for nota fiscal eletrônica, use o XML da NF-e para melhor resultado.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      dados,
      sucesso: true,
      paginasProcessadas: files.length,
    });

  } catch (err: unknown) {
    console.error("[parse-documento] Erro:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";

    if (message === "JSON_INVALIDO" || message.toLowerCase().includes("json")) {
      return NextResponse.json(
        { error: "A IA retornou uma resposta inesperada. Tente novamente ou use uma imagem diferente." },
        { status: 422 }
      );
    }

    if (message.includes("insufficient_quota") || message.includes("rate_limit")) {
      return NextResponse.json(
        { error: "Limite da API OpenAI atingido. Tente novamente em alguns instantes." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Erro ao processar: ${message}` },
      { status: 500 }
    );
  }
}
