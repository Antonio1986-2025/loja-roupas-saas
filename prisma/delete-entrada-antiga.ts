import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://postgres:TrShqFPIfVsrZwtBMQkXpxnqwuwtdfVs@reseau.proxy.rlwy.net:44215/railway" } },
});

async function main() {
  // A entrada antiga da PRALANA com a mesma chave — número 1 criada em 25/06
  const chave = "35260603910100000143550040001849651576333788";
  
  const entrada = await prisma.entradaMercadoria.findFirst({
    where: { chaveAcesso: chave },
    select: { id: true, numero: true, tenantId: true, createdAt: true },
  });

  if (!entrada) {
    console.log("Entrada não encontrada — já foi removida.");
    return;
  }

  console.log(`Encontrada Entrada #${entrada.numero} — criada em ${entrada.createdAt.toLocaleString("pt-BR")}`);
  console.log("Apagando itens e a entrada...");

  await prisma.movimentacaoEstoque.deleteMany({
    where: { variante: { produto: { tenantId: entrada.tenantId } } },
  });
  await prisma.entradaMercadoriaItem.deleteMany({ where: { entradaId: entrada.id } });
  await prisma.contaPagar.deleteMany({ where: { entradaId: entrada.id } });
  await prisma.entradaMercadoria.delete({ where: { id: entrada.id } });

  console.log("✅ Entrada antiga removida. Agora pode reimportar a NF.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
