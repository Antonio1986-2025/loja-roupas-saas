import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import path from "path";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) return;

  // 1. LEVIS NO BANCO
  console.log("=== LEVIS NO BANCO ===");
  const levisDB = await prisma.produto.findMany({
    where: { tenantId: tenant.id, nome: { contains: "levis", mode: "insensitive" } },
    include: { variantes: { select: { cor: true, tamanho: true, codigoBarras: true, qtdEstoque: true } } },
    orderBy: { nome: "asc" },
  });
  console.log(`Produtos LEVIS no banco: ${levisDB.length}`);
  for (const p of levisDB) {
    const est = p.variantes.reduce((s, v) => s + v.qtdEstoque, 0);
    console.log(`  ${p.nome} — ${p.variantes.length} variantes, ${est} un`);
  }

  // 2. LEVIS NA PLANILHA
  console.log("\n=== LEVIS NA PLANILHA EXCEL ===");
  const file = path.resolve(__dirname, "../California (LOJA ROUPAS).xlsx");
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets["Geral"];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  
  const levisXLS = rows.filter(r => 
    String(r["MARCA"] ?? "").toLowerCase().includes("levis") ||
    String(r["DESCRIÇÃO"] ?? "").toLowerCase().includes("levis") ||
    String(r["CATEGORIA"] ?? "").toLowerCase().includes("levis")
  );
  
  console.log(`Linhas LEVIS na planilha: ${levisXLS.length}`);
  for (const r of levisXLS) {
    console.log(`  ${r["CODIGO/INTERNO"]} | ${r["CATEGORIA"]} | ${r["MARCA"]} | ${r["DESCRIÇÃO"]} | ${r["COR"]} | tam ${r["TAMANHO"]} | qtd ${r["QUANTIDADE"]} | R$ ${r["VALOR DE VENDA"]}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
