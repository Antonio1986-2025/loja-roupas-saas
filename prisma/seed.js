// Seed script em JavaScript puro (CommonJS) - funciona em producao sem tsx
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  // Criar tenant de demonstracao
  const tenant = await prisma.tenant.upsert({
    where: { slug: "loja-demo" },
    update: {},
    create: {
      name: "Loja Demo",
      slug: "loja-demo",
      plan: "PRO",
      status: "ACTIVE",
    },
  });
  console.log("OK Tenant criado:", tenant.name);

  // Criar usuario admin
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      password: hashedPassword,
      name: "Administrador",
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });
  console.log("OK Usuario admin criado:", adminUser.email);

  // Criar categorias
  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "camisetas" } },
      update: {},
      create: { nome: "Camisetas", slug: "camisetas", tenantId: tenant.id },
    }),
    prisma.categoria.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "calcas" } },
      update: {},
      create: { nome: "Calcas", slug: "calcas", tenantId: tenant.id },
    }),
    prisma.categoria.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "vestidos" } },
      update: {},
      create: { nome: "Vestidos", slug: "vestidos", tenantId: tenant.id },
    }),
  ]);
  console.log("OK Categorias criadas:", categorias.length);

  // Criar configuracao
  await prisma.configuracao.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      nomeEmpresa: "Loja Demo",
      telefone: "(11) 99999-9999",
      email: "contato@demo.com",
      cidade: "Sao Paulo",
      estado: "SP",
    },
  });
  console.log("OK Configuracao criada");

  console.log("");
  console.log("========================================");
  console.log("Seed concluido com sucesso!");
  console.log("Credenciais de acesso:");
  console.log("  Email: admin@demo.com");
  console.log("  Senha: admin123");
  console.log("========================================");
}

main()
  .catch((e) => {
    console.error("ERRO no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });