import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Danfe } from "@/components/danfe";

export default async function DanfePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const [nota, config] = await Promise.all([
    prisma.notaFiscal.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: {
        itens: {
          include: {
            variante: {
              select: { codigoBarras: true, codigoInterno: true, produto: { select: { nome: true } } },
            },
          },
        },
      },
    }),
    prisma.configuracao.findUnique({ where: { tenantId: session.user.tenantId } }),
  ]);

  if (!nota || !config) redirect("/notas-fiscais");

  return (
    <div className="min-h-screen bg-white p-4">
      <Danfe
        nota={{
          tipo: nota.tipo,
          modelo: nota.modelo,
          serie: nota.serie,
          numero: nota.numero,
          chaveAcesso: nota.chaveAcesso || undefined,
          nProt: nota.nProt || undefined,
          dataEmissao: nota.dataEmissao.toISOString(),
          naturezaOperacao: nota.naturezaOperacao || undefined,
          ambiente: nota.ambiente,

          emitenteNome: config.nomeEmpresa,
          emitenteCnpj: config.cnpj || "",
          emitenteIE: config.inscricaoEstadual || undefined,
          emitenteEndereco: config.endereco || undefined,
          emitenteCidade: config.cidade || undefined,
          emitenteEstado: config.estado || undefined,

          clienteNome: nota.clienteNome || undefined,
          clienteCpfCnpj: nota.clienteCpfCnpj || undefined,
          clienteEndereco: nota.clienteEndereco || undefined,
          clienteCidade: nota.clienteCidade || undefined,
          clienteEstado: nota.clienteEstado || undefined,

          itens: nota.itens.map((item) => ({
            codigo: item.variante?.codigoBarras || item.variante?.codigoInterno || item.varianteId,
            nome: item.variante?.produto?.nome || "Produto",
            ncm: item.ncm || undefined,
            cfop: item.cfop || undefined,
            csosn: item.csosn || undefined,
            quantidade: item.quantidade,
            precoUnitario: Number(item.precoUnitario),
            valorTotal: Number(item.valorTotal),
          })),

          valorProdutos: Number(nota.valorProdutos || nota.valorTotal),
          valorDesconto: nota.valorDesconto ? Number(nota.valorDesconto) : undefined,
          valorFrete: nota.valorFrete ? Number(nota.valorFrete) : undefined,
          valorTotal: Number(nota.valorTotal),
          observacao: nota.observacao || undefined,
        }}
      />
    </div>
  );
}
