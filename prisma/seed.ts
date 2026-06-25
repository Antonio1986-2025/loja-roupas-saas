import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Criar tenant de demonstração
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

  console.log("✅ Tenant criado:", tenant.name);

  // Criar usuário admin
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

  console.log("✅ Usuário admin criado:", adminUser.email);

  // Criar categorias
  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "camisetas" } },
      update: {},
      create: {
        nome: "Camisetas",
        slug: "camisetas",
        tenantId: tenant.id,
      },
    }),
    prisma.categoria.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "calcas" } },
      update: {},
      create: {
        nome: "Calças",
        slug: "calcas",
        tenantId: tenant.id,
      },
    }),
    prisma.categoria.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "vestidos" } },
      update: {},
      create: {
        nome: "Vestidos",
        slug: "vestidos",
        tenantId: tenant.id,
      },
    }),
  ]);

  console.log("✅ Categorias criadas:", categorias.length);

  // Criar produtos de exemplo (idempotente)
  const produtoExistente = await prisma.produto.findFirst({
    where: { tenantId: tenant.id, codigoInterno: "CAM001" },
  });

  const produto1 = produtoExistente
    ? produtoExistente
    : await prisma.produto.create({
    data: {
      nome: "Camiseta Básica",
      descricao: "Camiseta de algodão confortável",
      codigoInterno: "CAM001",
      marca: "California",
      genero: "UNISSEX",
      precoVenda: 49.90,
      precoCusto: 25.00,
      categoriaId: categorias[0].id,
      tenantId: tenant.id,
      variantes: {
        create: [
          {
            cor: "Branco",
            tamanho: "P",
            codigoBarras: "7891234560001",
            qtdEstoque: 10,
            qtdDisponivel: 10,
            estoqueMinimo: 5,
          },
          {
            cor: "Branco",
            tamanho: "M",
            codigoBarras: "7891234560002",
            qtdEstoque: 15,
            qtdDisponivel: 15,
            estoqueMinimo: 5,
          },
          {
            cor: "Preto",
            tamanho: "P",
            codigoBarras: "7891234560003",
            qtdEstoque: 8,
            qtdDisponivel: 8,
            estoqueMinimo: 5,
          },
        ],
      },
    },
  });

  console.log("✅ Produto criado:", produto1.nome);

  // Criar configuração
  await prisma.configuracao.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      nomeEmpresa: "Loja Demo California",
      telefone: "(11) 99999-9999",
      email: "contato@demo.com",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  console.log("✅ Configuração criada");

  // Criar cliente de exemplo
  const cliente = await prisma.cliente.upsert({
    where: { id: "cliente-demo-1" },
    update: {},
    create: {
      id: "cliente-demo-1",
      nome: "Maria Silva",
      telefone: "(11) 98888-7777",
      cpf: "123.456.789-00",
      tenantId: tenant.id,
    },
  });
  console.log("✅ Cliente criado:", cliente.nome);

  // Criar condicional de exemplo (se ainda não existir nenhuma)
  const condicionalExistente = await prisma.vendaCondicional.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!condicionalExistente) {
    const variantes = await prisma.produtoVariante.findMany({
      where: { produto: { tenantId: tenant.id } },
      take: 2,
    });

    if (variantes.length > 0) {
      const dataSaida = new Date();
      const dataVencimento = new Date(dataSaida);
      dataVencimento.setDate(dataVencimento.getDate() + 5);

      await prisma.vendaCondicional.create({
        data: {
          numero: 1,
          tenantId: tenant.id,
          clienteId: cliente.id,
          vendedorId: adminUser.id,
          dataSaida,
          dataVencimento,
          prazoDias: 5,
          status: "ATIVA",
          observacoes: "Cliente vai experimentar em casa",
          itens: {
            create: variantes.map((v) => ({
              varianteId: v.id,
              quantidade: 1,
              precoUnit: v.precoVenda ?? 49.9,
              subtotal: v.precoVenda ?? 49.9,
            })),
          },
        },
      });

      // Reservar estoque das variantes na condicional
      for (const v of variantes) {
        await prisma.produtoVariante.update({
          where: { id: v.id },
          data: {
            qtdDisponivel: { decrement: 1 },
            qtdCondicional: { increment: 1 },
          },
        });
      }

      console.log("✅ Condicional de exemplo criada");
    }
  }

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📝 Credenciais de acesso:");
  console.log("   Email: admin@demo.com");
  console.log("   Senha: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
