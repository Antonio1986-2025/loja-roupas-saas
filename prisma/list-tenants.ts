import prisma from "../src/lib/prisma";
prisma.tenant.findMany({ select: { slug: true, name: true } })
  .then((r) => r.forEach((t) => console.log(`slug: "${t.slug}"  nome: ${t.name}`)))
  .finally(() => prisma.$disconnect());
