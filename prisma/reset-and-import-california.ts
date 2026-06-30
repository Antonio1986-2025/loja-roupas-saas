/**
 * RESET COMPLETO + IMPORT da planilha California (LOJA ROUPAS).xlsx
 *
 * MANTÉM: Tenant, User, Cliente, Configuracao
 * APAGA: Tudo o resto
 * IMPORTA: Categorias, Produtos, Variantes com fotos
 */
import { PrismaClient, Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import path from "path";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

const TENANT_SLUG = "california-store";

/** Converte URL do Google Drive para formato visualizável */
function normalizarFotoUrl(url: string): string | null {
  if (!url || !url.trim()) return null;
  const u = url.trim();
  // https://drive.google.com/file/d/ID/view?usp=...
  const m = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) {
    return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
  }
  return u;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function mapGenero(g: string): "MASCULINO" | "FEMININO" | "UNISSEX" | "INFANTIL" | null {
  const v = g.toUpperCase().trim();
  if (v.includes("MASC")) return "MASCULINO";
  if (v.includes("FEMIN")) return "FEMININO";
  if (v.includes("UNISS")) return "UNISSEX";
  if (v.includes("INFAN")) return "INFANTIL";
  return null;
}

async function main() {
  console.log("🔍 Buscando tenant california-store...");
  const tenant = await prisma.tenant.findFirst({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error("Tenant não encontrado!");
  const tenantId = tenant.id;
  console.log(`✅ Tenant: ${tenant.name} (id: ${tenantId})\n`);

  // ===================== RESET =====================
  console.log("=".repeat(60));
  console.log("🗑️  FASE 1 — APAGANDO DADOS (exceto Tenant/User/Cliente)");
  console.log("=".repeat(60));

  // Conta antes
  const antes = {
    produtos: await prisma.produto.count({ where: { tenantId } }),
    variantes: await prisma.produtoVariante.count({ where: { produto: { tenantId } } }),
    categorias: await prisma.categoria.count({ where: { tenantId } }),
    fornecedores: await prisma.fornecedor.count({ where: { tenantId } }),
    vendas: await prisma.venda.count({ where: { tenantId } }),
    clientes: await prisma.cliente.count({ where: { tenantId } }),
    users: await prisma.user.count({ where: { tenantId } }),
  };
  console.log("Antes:", antes);
  console.log();

  // Ordem de exclusão respeitando FKs
  const steps = [
    { name: "Pagamentos de vendas", fn: () => prisma.vendaPagamento.deleteMany({ where: { venda: { tenantId } } }) },
    { name: "Itens de vendas", fn: () => prisma.vendaItem.deleteMany({ where: { venda: { tenantId } } }) },
    { name: "Itens de orçamentos", fn: () => prisma.orcamentoItem.deleteMany({ where: { orcamento: { tenantId } } }) },
    { name: "Itens condicionais", fn: () => prisma.vendaCondicionalItem.deleteMany({ where: { condicional: { tenantId } } }) },
    { name: "Itens entradas mercadoria", fn: () => prisma.entradaMercadoriaItem.deleteMany({ where: { entrada: { tenantId } } }) },
    { name: "Movimentos de caixa", fn: () => prisma.caixaMovimento.deleteMany({ where: { caixa: { tenantId } } }) },
    { name: "Contas a Receber", fn: () => prisma.contaReceber.deleteMany({ where: { tenantId } }) },
    { name: "Contas a Pagar", fn: () => prisma.contaPagar.deleteMany({ where: { tenantId } }) },
    { name: "Orçamentos", fn: () => prisma.orcamento.deleteMany({ where: { tenantId } }) },
    { name: "Vendas", fn: () => prisma.venda.deleteMany({ where: { tenantId } }) },
    { name: "Condicionais", fn: () => prisma.vendaCondicional.deleteMany({ where: { tenantId } }) },
    { name: "Entradas de Mercadoria", fn: () => prisma.entradaMercadoria.deleteMany({ where: { tenantId } }) },
    { name: "Caixas", fn: () => prisma.caixa.deleteMany({ where: { tenantId } }) },
    { name: "Notas fiscais", fn: () => prisma.notaFiscal.deleteMany({ where: { tenantId } }) },
    { name: "Movimentações de caixa", fn: () => prisma.movimentacaoCaixa.deleteMany({ where: { tenantId } }) },
    { name: "Movimentações estoque", fn: () => prisma.movimentacaoEstoque.deleteMany({ where: { variante: { produto: { tenantId } } } }) },
    { name: "Variantes de produtos", fn: () => prisma.produtoVariante.deleteMany({ where: { produto: { tenantId } } }) },
    { name: "Produtos", fn: () => prisma.produto.deleteMany({ where: { tenantId } }) },
    { name: "Categorias", fn: () => prisma.categoria.deleteMany({ where: { tenantId } }) },
    { name: "Fornecedores", fn: () => prisma.fornecedor.deleteMany({ where: { tenantId } }) },
    { name: "Funcionários", fn: () => prisma.funcionario.deleteMany({ where: { tenantId } }) },
  ];

  for (const s of steps) {
    const r = await s.fn();
    console.log(`  🗑️  ${s.name}: ${r.count} apagados`);
  }

  // Conta depois
  const depois = {
    produtos: await prisma.produto.count({ where: { tenantId } }),
    variantes: await prisma.produtoVariante.count({ where: { produto: { tenantId } } }),
    categorias: await prisma.categoria.count({ where: { tenantId } }),
    clientes: await prisma.cliente.count({ where: { tenantId } }),
    users: await prisma.user.count({ where: { tenantId } }),
  };
  console.log("\nDepois:", depois);

  // Validações de segurança
  if (depois.clientes !== antes.clientes) throw new Error("⛔ Clientes foram apagados acidentalmente!");
  if (depois.users !== antes.users) throw new Error("⛔ Usuários foram apagados acidentalmente!");

  console.log("\n✅ Reset concluído — Clientes e Usuários preservados");

  // ===================== IMPORT =====================
  console.log("\n" + "=".repeat(60));
  console.log("📥 FASE 2 — IMPORTANDO produtos da planilha");
  console.log("=".repeat(60));

  const file = path.resolve(__dirname, "../California (LOJA ROUPAS).xlsx");
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets["Geral"];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];

  console.log(`📄 Total de linhas na planilha: ${rows.length}\n`);

  // Coleta categorias únicas
  const categoriasUnicas = new Set<string>();
  for (const row of rows) {
    const cat = String(row["CATEGORIA"] ?? "").trim();
    if (cat) categoriasUnicas.add(cat);
  }

  console.log(`📂 Criando ${categoriasUnicas.size} categorias...`);
  const mapaCategorias = new Map<string, string>();
  for (const nome of categoriasUnicas) {
    const cat = await prisma.categoria.create({
      data: { nome, slug: slugify(nome), tenantId },
    });
    mapaCategorias.set(nome, cat.id);
  }
  console.log(`  ✅ ${mapaCategorias.size} categorias criadas\n`);

  // Agrupa por (DESCRIÇÃO + MARCA + CATEGORIA + GENERO)
  type Linha = {
    codigoInterno: string;
    codigoFornecedor: string;
    categoria: string;
    marca: string;
    descricao: string;
    genero: string;
    tamanho: string;
    cor: string;
    quantidade: number;
    precoCusto: number;
    precoVenda: number;
    fotoUrl: string | null;
  };

  const linhas: Linha[] = rows.map((r) => ({
    codigoInterno: String(r["CODIGO/INTERNO"] ?? "").trim(),
    codigoFornecedor: String(r["CODIGO/FORNECEDOR"] ?? "").trim(),
    categoria: String(r["CATEGORIA"] ?? "").trim(),
    marca: String(r["MARCA"] ?? "").trim(),
    descricao: String(r["DESCRIÇÃO"] ?? "").trim() || "Sem descrição",
    genero: String(r["GENERO"] ?? "").trim(),
    tamanho: String(r["TAMANHO"] ?? "").trim(),
    cor: String(r["COR"] ?? "").trim(),
    quantidade: Number(r["QUANTIDADE"] ?? 0) || 0,
    precoCusto: Number(r["VALOR DE CUSTO"] ?? 0) || 0,
    precoVenda: Number(r["VALOR DE VENDA"] ?? 0) || 0,
    fotoUrl: normalizarFotoUrl(String(r["FOTOS"] ?? "")),
  })).filter(l => l.codigoInterno || l.descricao !== "Sem descrição");

  // Agrupa em produtos
  const produtosMap = new Map<string, {
    nome: string;
    marca: string;
    categoria: string;
    genero: string;
    precoCusto: number;
    precoVenda: number;
    fotoUrl: string | null;
    variantes: Linha[];
  }>();

  for (const linha of linhas) {
    const nomeProduto = [linha.categoria, linha.descricao, linha.marca].filter(Boolean).join(" ").toUpperCase();
    const key = `${nomeProduto}|${linha.genero}`;
    if (!produtosMap.has(key)) {
      produtosMap.set(key, {
        nome: nomeProduto + (linha.genero ? ` (${linha.genero})` : ""),
        marca: linha.marca,
        categoria: linha.categoria,
        genero: linha.genero,
        precoCusto: linha.precoCusto,
        precoVenda: linha.precoVenda,
        fotoUrl: linha.fotoUrl,
        variantes: [],
      });
    }
    const prod = produtosMap.get(key)!;
    prod.variantes.push(linha);
    // Usa a primeira foto válida que encontrar
    if (!prod.fotoUrl && linha.fotoUrl) prod.fotoUrl = linha.fotoUrl;
  }

  console.log(`📦 Criando ${produtosMap.size} produtos com variantes...\n`);

  let produtosCriados = 0;
  let variantesCriadas = 0;
  let variantesIgnoradas = 0;
  const codigosUsados = new Set<string>();
  const erros: string[] = [];

  for (const prod of produtosMap.values()) {
    try {
      const categoriaId = mapaCategorias.get(prod.categoria) ?? null;

      // Cria produto
      const produto = await prisma.produto.create({
        data: {
          nome: prod.nome,
          marca: prod.marca || null,
          genero: mapGenero(prod.genero),
          precoVenda: new Prisma.Decimal(prod.precoVenda),
          precoCusto: prod.precoCusto > 0 ? new Prisma.Decimal(prod.precoCusto) : null,
          fotoUrl: prod.fotoUrl,
          categoriaId,
          tenantId,
        },
      });
      produtosCriados++;

      // Cria variantes — gera código único quando duplicado
      for (const v of prod.variantes) {
        let codigoBarras = v.codigoInterno;
        // Se já usou esse código, anexa cor+tamanho
        if (codigosUsados.has(codigoBarras)) {
          const sufixo = [v.cor, v.tamanho].filter(Boolean).join("-").toUpperCase().slice(0, 30);
          codigoBarras = `${v.codigoInterno}-${sufixo}`;
        }
        // Se ainda duplica, adiciona sequencial
        let n = 1;
        while (codigosUsados.has(codigoBarras)) {
          codigoBarras = `${v.codigoInterno}-${n++}`;
        }
        codigosUsados.add(codigoBarras);

        try {
          await prisma.produtoVariante.create({
            data: {
              produtoId: produto.id,
              cor: v.cor || null,
              tamanho: v.tamanho || null,
              codigoBarras,
              codigoInterno: v.codigoInterno,
              codigoFornecedor: v.codigoFornecedor || null,
              precoVenda: v.precoVenda > 0 ? new Prisma.Decimal(v.precoVenda) : null,
              qtdEstoque: v.quantidade,
              qtdDisponivel: v.quantidade,
            },
          });
          variantesCriadas++;
        } catch (e: unknown) {
          variantesIgnoradas++;
          erros.push(`Variante ${codigoBarras}: ${e instanceof Error ? e.message.slice(0, 60) : "?"}`);
        }
      }
    } catch (e: unknown) {
      erros.push(`Produto ${prod.nome}: ${e instanceof Error ? e.message.slice(0, 60) : "?"}`);
    }
  }

  console.log(`✅ Produtos criados: ${produtosCriados}`);
  console.log(`✅ Variantes criadas: ${variantesCriadas}`);
  if (variantesIgnoradas > 0) console.log(`⚠️  Variantes ignoradas (erros): ${variantesIgnoradas}`);

  // ===================== VERIFICAÇÃO =====================
  console.log("\n" + "=".repeat(60));
  console.log("🔍 FASE 3 — REVISÃO PÓS-IMPORT");
  console.log("=".repeat(60));

  const final = await prisma.produto.count({ where: { tenantId } });
  const finalVar = await prisma.produtoVariante.count({ where: { produto: { tenantId } } });
  const finalCat = await prisma.categoria.count({ where: { tenantId } });
  const totalEstoque = await prisma.produtoVariante.aggregate({
    where: { produto: { tenantId } },
    _sum: { qtdEstoque: true },
  });
  const valorCusto = await prisma.produto.aggregate({
    where: { tenantId },
    _sum: { precoCusto: true },
  });
  const valorVenda = await prisma.produto.aggregate({
    where: { tenantId },
    _sum: { precoVenda: true },
  });
  const comFoto = await prisma.produto.count({
    where: { tenantId, fotoUrl: { not: null } },
  });
  const semFoto = await prisma.produto.count({
    where: { tenantId, fotoUrl: null },
  });

  console.log(`\n📊 ESTADO FINAL DA LOJA:`);
  console.log(`  Categorias: ${finalCat}`);
  console.log(`  Produtos: ${final}`);
  console.log(`  Variantes: ${finalVar}`);
  console.log(`  Unidades em estoque: ${totalEstoque._sum.qtdEstoque ?? 0}`);
  console.log(`  Soma preço de custo: R$ ${Number(valorCusto._sum.precoCusto ?? 0).toFixed(2)}`);
  console.log(`  Soma preço de venda: R$ ${Number(valorVenda._sum.precoVenda ?? 0).toFixed(2)}`);
  console.log(`  Produtos COM foto: ${comFoto}`);
  console.log(`  Produtos SEM foto: ${semFoto}`);
  console.log(`  Clientes: ${depois.clientes}`);
  console.log(`  Usuários: ${depois.users}`);

  // Top categorias
  const cats = await prisma.categoria.findMany({
    where: { tenantId },
    include: { _count: { select: { produtos: true } } },
    orderBy: { nome: "asc" },
  });
  console.log(`\n📂 Produtos por categoria:`);
  for (const c of cats) {
    if (c._count.produtos > 0) console.log(`  ${c.nome}: ${c._count.produtos}`);
  }

  if (erros.length > 0) {
    console.log(`\n⚠️  Erros encontrados (${erros.length}):`);
    erros.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (erros.length > 10) console.log(`  ... e mais ${erros.length - 10}`);
  }

  console.log(`\n✅ CONCLUÍDO!`);
}

main()
  .catch((e) => { console.error("\n❌ ERRO FATAL:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
