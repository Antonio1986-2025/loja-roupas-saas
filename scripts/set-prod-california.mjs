import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const config = await p.configuracao.findUnique({ where: { tenantId: "cmqv85i07000011oi3t1fj698" } });
console.log("Antes - ambiente:", config?.ambienteNFe, "cnpj:", config?.cnpj);
await p.configuracao.update({ where: { tenantId: "cmqv85i07000011oi3t1fj698" }, data: { ambienteNFe: "1" } });
const depois = await p.configuracao.findUnique({ where: { tenantId: "cmqv85i07000011oi3t1fj698" } });
console.log("Depois - ambiente:", depois?.ambienteNFe);
await p.$disconnect();
