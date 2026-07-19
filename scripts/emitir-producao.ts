import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.configuracao.findFirst();
  if (!config) { console.log("ERRO: sem config"); process.exit(1); }

  console.log("=== CONFIG ===");
  console.log("tenantId:", config.tenantId);
  console.log("ambienteNFe:", config.ambienteNFe);

  // Encontrar cliente
  let cliente = await prisma.cliente.findFirst({ where: { tenantId: config.tenantId } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: { tenantId: config.tenantId, nome: "Cliente Teste", cpf: "52998224725" },
    });
    console.log("Cliente criado:", cliente.id);
  } else {
    console.log("Cliente:", cliente.id, cliente.nome);
  }

  // Encontrar produto
  let produto = await prisma.produto.findFirst({ where: { tenantId: config.tenantId } });
  if (!produto) {
    console.log("Nenhum produto encontrado. Criando...");
    produto = await prisma.produto.create({
      data: { tenantId: config.tenantId, nome: "Produto Teste", preco: 1.0 },
    });
  }

  // Criar venda
  const venda = await prisma.venda.create({
    data: {
      tenantId: config.tenantId,
      clienteId: cliente.id,
      status: "CONCLUIDA",
      total: 1.0,
      formaPagamento: "DINHEIRO",
      itens: {
        create: {
          produtoNome: produto.nome,
          produtoId: produto.id,
          quantidade: 1,
          valorUnitario: 1.0,
          valorTotal: 1.0,
        },
      },
    },
  });
  console.log("Venda criada:", venda.id);

  // Agora importa e chama o servico de emissao
  const { emitirNFe } = await import("../src/lib/services/nfe-emissao.service");
  const resultado = await emitirNFe(config.tenantId, venda.id, "NFE");

  console.log("\n=== RESULTADO ===");
  console.log("id:", resultado.id);
  console.log("chaveAcesso:", resultado.chaveAcesso);
  console.log("protocolo:", resultado.protocolo);
  console.log("status:", resultado.status);
  console.log("cStat:", resultado.cStat);
  console.log("xMotivo:", resultado.xMotivo);
  console.log("numero:", resultado.numero);
  console.log("serie:", resultado.serie);
}

main().catch((err) => {
  console.error("ERRO:", err);
  if (err.response) console.error("response data:", err.response);
}).finally(() => prisma.$disconnect());
