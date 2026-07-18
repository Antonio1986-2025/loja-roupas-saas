// Script temporário SOMENTE LEITURA para localizar a venda/cliente de teste
// (Berenice) no banco de produção via proxy público, sem alterar nada.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cliente = await prisma.cliente.findFirst({
    where: { nome: { contains: "BERENICE", mode: "insensitive" } },
  });
  console.log("Cliente:", JSON.stringify(cliente, null, 2));

  if (cliente) {
    const vendas = await prisma.venda.findMany({
      where: { clienteId: cliente.id },
      select: { id: true, numero: true, status: true, total: true, createdAt: true, tenantId: true },
      orderBy: { createdAt: "desc" },
    });
    console.log("Vendas do cliente:", JSON.stringify(vendas, null, 2));

    const notas = await prisma.notaFiscal.findMany({
      where: { clienteCpfCnpj: cliente.cpf || undefined },
      select: { id: true, numero: true, status: true, cStat: true, xMotivo: true, vendaId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    console.log("Notas fiscais existentes:", JSON.stringify(notas, null, 2));
  }

  const config = cliente
    ? await prisma.configuracao.findUnique({ where: { tenantId: cliente.tenantId } })
    : null;
  console.log("Config do tenant da Berenice (sem dados sensiveis):", JSON.stringify({
    tenantId: config?.tenantId,
    nomeEmpresa: config?.nomeEmpresa,
    cnpj: config?.cnpj,
    ambienteNFe: config?.ambienteNFe,
    temCertificado: !!config?.certificadoA1,
    temSenhaCertificado: !!config?.senhaCertificado,
    nfeSerie: config?.nfeSerie,
    nfeNumero: config?.nfeNumero,
  }, null, 2));
}

main().finally(() => prisma.$disconnect());
