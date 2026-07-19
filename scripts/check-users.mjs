import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const users = await p.user.findMany({ select: { email: true, name: true, tenantId: true } });
for (const u of users) {
  console.log(u.email, "|", u.name, "| tenant:", u.tenantId);
}
await p.$disconnect();
