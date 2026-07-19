import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const configs = await p.configuracao.findMany();
for (const c of configs) {
  console.log("id:", c.id, "tenantId:", c.tenantId, "nome:", c.nomeEmpresa, "cnpj:", c.cnpj?.substring(0,8), "ambiente:", c.ambienteNFe);
}
await p.$disconnect();
