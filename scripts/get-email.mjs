import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const u = await p.user.findFirst();
console.log(u?.email);
await p.$disconnect();
