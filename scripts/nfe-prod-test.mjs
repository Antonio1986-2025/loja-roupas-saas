process.env.DATABASE_URL = "postgresql://postgres:vPtfhSDYRhNUNPWPJKnAwdJTGdInNsAc@localhost:5433/railway";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const config = await prisma.configuracao.findFirst();
  if (!config) {
    console.log("Nenhuma configuracao encontrada");
    process.exit(1);
  }
  console.log("=== CONFIG ATUAL ===");
  console.log("tenantId:", config.tenantId);
  console.log("ambienteNFe atual:", config.ambienteNFe);
  console.log("id:", config.id);

  await prisma.configuracao.update({
    where: { id: config.id },
    data: { ambienteNFe: "1" },
  });
  console.log("\n✅ Ambiente alterado para PRODUCAO (1)");

  const confirm = await prisma.configuracao.findUnique({ where: { id: config.id } });
  console.log("ambienteNFe confirmado:", confirm?.ambienteNFe);

  const venda = await prisma.venda.findFirst({
    where: {
      tenantId: config.tenantId,
      status: "CONCLUIDA",
    },
    include: { cliente: true },
    orderBy: { createdAt: "desc" },
  });

  if (venda) {
    console.log("\nVenda para emitir NF-e:");
    console.log("  id:", venda.id);
    console.log("  total:", venda.total);
    console.log("  cliente:", venda.cliente?.nome || "N/A");
  } else {
    console.log("\nNenhuma venda CONCLUIDA encontrada.");
  }
} catch (err) {
  console.error("ERRO:", err);
} finally {
  await prisma.$disconnect();
}
