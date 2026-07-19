import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const vendas = await p.venda.findMany({
  where: { tenantId: "cmqv85i07000011oi3t1fj698" },
  take: 5,
  orderBy: { createdAt: "desc" },
  include: { itens: { take: 1 }, cliente: { select: { nome: true } }, notasFiscais: { take: 1, select: { id: true } } },
});
for (const v of vendas) {
  console.log("id:", v.id, "| num:", v.numero, "| total:", v.total, "| cliente:", v.cliente?.nome, "| NFe:", v.notasFiscais.length > 0 ? "sim" : "nao");
}
await p.$disconnect();
