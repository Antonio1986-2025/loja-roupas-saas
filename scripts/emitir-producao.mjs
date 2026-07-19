import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "http://localhost:8080";

async function main() {
  const config = await prisma.configuracao.findFirst();
  if (!config) { console.log("ERRO: sem config"); process.exit(1); }

  console.log("tenantId:", config.tenantId);
  console.log("ambienteNFe:", config.ambienteNFe);

  // Encontrar cliente
  let cliente = await prisma.cliente.findFirst({ where: { tenantId: config.tenantId } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        tenantId: config.tenantId,
        nome: "Cliente Teste Producao",
        cpfCnpj: "52998224725",
        tipoPessoa: "FISICA",
      },
    });
    console.log("Cliente criado:", cliente.id);
  }

  // Encontrar produto
  let produto = await prisma.produto.findFirst({ where: { tenantId: config.tenantId } });
  if (!produto) {
    produto = await prisma.produto.create({
      data: {
        tenantId: config.tenantId,
        nome: "Produto Teste",
        preco: 1.0,
        situacaoTributaria: "TRIBUTADO",
      },
    });
    console.log("Produto criado:", produto.id);
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
  console.log("Venda criada:", venda.id, "total:", venda.total);

  // Emitir NFe via API local
  const res = await fetch(`${BASE}/api/nfe/emitir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendaId: venda.id, tipo: "NFE" }),
  });

  const data = await res.json();
  console.log("\n=== RESULTADO EMISSAO ===");
  if (res.ok) {
    console.log("SUCESSO!");
    console.log("  id:", data.id);
    console.log("  chaveAcesso:", data.chaveAcesso);
    console.log("  protocolo:", data.protocolo);
    console.log("  status:", data.status);
    console.log("  cStat:", data.cStat);
    console.log("  xMotivo:", data.xMotivo);
    console.log("  numero:", data.numero);
    console.log("  serie:", data.serie);
  } else {
    console.log("ERRO:", data.error, "-", data.message);
    if (data.issues) console.log("issues:", data.issues);
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
}).finally(() => prisma.$disconnect());
