import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { buscarVendaCondicional } from "@/lib/services/venda-condicional.service";
import { CondicionalDetalhe } from "@/components/condicional/detalhe";

export default async function CondicionalDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  let condicional;
  try {
    condicional = await buscarVendaCondicional(session.user.tenantId, params.id);
  } catch {
    notFound();
  }

  // Serializa Decimals para number
  const data = {
    id: condicional.id,
    numero: condicional.numero,
    status: condicional.status,
    prazoDias: condicional.prazoDias,
    dataSaida: condicional.dataSaida.toISOString(),
    dataVencimento: condicional.dataVencimento.toISOString(),
    dataFinalizacao: condicional.dataFinalizacao?.toISOString() ?? null,
    dataCancelamento: condicional.dataCancelamento?.toISOString() ?? null,
    observacoes: condicional.observacoes,
    cliente: condicional.cliente ? {
      nome: condicional.cliente.nome,
      telefone: condicional.cliente.telefone,
    } : null,
    vendaGerada: condicional.vendaGerada
      ? {
          id: condicional.vendaGerada.id,
          numero: condicional.vendaGerada.numero,
          total: Number(condicional.vendaGerada.total),
        }
      : null,
    itens: condicional.itens.map((i) => ({
      id: i.id,
      nome: i.variante.produto.nome,
      cor: i.variante.cor,
      tamanho: i.variante.tamanho,
      quantidade: i.quantidade,
      precoUnit: Number(i.precoUnit),
      subtotal: Number(i.subtotal),
      statusFinal: i.statusFinal,
    })),
  };

  return <CondicionalDetalhe condicional={data} />;
}
