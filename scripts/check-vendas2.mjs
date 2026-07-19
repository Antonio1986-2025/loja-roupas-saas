import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const vendas = await db.venda.findMany({
  where: { tenantId: "cmqv85i07000011oi3t1fj698" },
  take: 5,
  orderBy: { createdAt: "desc" },
  select: { id: true, numero: true, total: true, status: true, cliente: { select: { nome: true } } },
});
for (const v of vendas) {
  console.log(v.id, v.numero, v.total, v.status, v.cliente?.nome);
}
const vendasSemNFe = await db.venda.findMany({
  where: {
    tenantId: "cmqv85i07000011oi3t1fj698",
    status: "CONCLUIDA",
    notasFiscais: { none: {} },
  },
  take: 3,
  orderBy: { createdAt: "desc" },
  select: { id: true, numero: true, total: true, cliente: { select: { nome: true } } },
});
console.log("\n--- SEM NFe ---");
for (const v of vendasSemNFe) {
  console.log(v.id, v.numero, v.total, v.cliente?.nome);
}
await db.$disconnect();
