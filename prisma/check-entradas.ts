import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "california-store" } });
  if (!tenant) return;

  const entradas = await prisma.entradaMercadoria.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true, numero: true, numeroNFe: true, chaveAcesso: true, createdAt: true,
      fornecedores: { select: { nome: true } },
      itens: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`\n📋 Últimas entradas (${entradas.length}):\n`);
  for (const e of entradas) {
    console.log(`#${e.numero} NF ${e.numeroNFe ?? "—"} — ${e.fornecedores?.nome ?? "sem fornecedor"}`);
    console.log(`  Itens: ${e.itens.length} | Criado: ${e.createdAt.toLocaleString("pt-BR")}`);
    if (e.chaveAcesso) console.log(`  Chave: ${e.chaveAcesso.slice(0, 20)}...`);
    console.log();
  }

  // Verifica se a chave da NF da screenshot já existe
  const chaveNF = "35260603910100000143550040001849651576333788";
  const existe = await prisma.entradaMercadoria.findFirst({
    where: { chaveAcesso: chaveNF },
    select: { numero: true, createdAt: true },
  });
  
  if (existe) {
    console.log(`⚠️  NF com chave ${chaveNF.slice(0,20)}... JÁ EXISTE como Entrada #${existe.numero}`);
    console.log(`   Criada em: ${existe.createdAt.toLocaleString("pt-BR")}`);
    console.log(`   Este é o motivo do erro — NF duplicada!`);
  } else {
    console.log(`✅ Chave dessa NF não existe no banco — não é duplicata`);
    console.log(`   O erro deve ser outro. Verifique se todos os produtos têm varianteId vinculado.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
