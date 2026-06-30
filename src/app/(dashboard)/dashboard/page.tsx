import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  FileText,
  AlertTriangle,
} from "lucide-react";

async function getDashboardData(tenantId: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  // Query de estoque baixo: qtdEstoque <= estoqueMinimo E estoqueMinimo > 0
  const estoqueBaixoResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM "produto_variantes" pv
    JOIN "produtos" p ON p.id = pv."produtoId"
    WHERE p."tenantId" = ${tenantId}
      AND pv."estoqueMinimo" > 0
      AND pv."qtdEstoque" <= pv."estoqueMinimo"
  `;
  const estoqueBaixo = Number(estoqueBaixoResult[0]?.count ?? 0);

  const [
    vendasHoje,
    vendasMes,
    totalProdutos,
    totalClientes,
    condicionaisAtivas,
    condicionaisVencidas,
    vendasRecentes,
  ] = await Promise.all([
    prisma.venda.aggregate({
      where: { tenantId, createdAt: { gte: hoje }, status: "CONCLUIDA" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.venda.aggregate({
      where: { tenantId, createdAt: { gte: inicioMes }, status: "CONCLUIDA" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.produto.count({ where: { tenantId, ativo: true } }),
    prisma.cliente.count({ where: { tenantId } }),
    prisma.vendaCondicional.count({ where: { tenantId, status: "ATIVA" } }),
    prisma.vendaCondicional.count({
      where: { tenantId, status: "ATIVA", dataVencimento: { lt: new Date() } },
    }),
    prisma.venda.findMany({
      where: { tenantId, status: "CONCLUIDA" },
      include: { cliente: { select: { nome: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    vendasHoje: { total: vendasHoje._sum.total || 0, quantidade: vendasHoje._count },
    vendasMes: { total: vendasMes._sum.total || 0, quantidade: vendasMes._count },
    totalProdutos,
    totalClientes,
    estoqueBaixo,
    condicionaisAtivas,
    condicionaisVencidas,
    vendasRecentes,
  };
}

const formaPagamentoLabel: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  PIX: "PIX",
  BOLETO: "Boleto",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const data = await getDashboardData(session.user.tenantId);

  const cards = [
    {
      title: "Vendas Hoje",
      value: formatCurrency(Number(data.vendasHoje.total)),
      subtitle: `${data.vendasHoje.quantidade} vendas`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Vendas do Mês",
      value: formatCurrency(Number(data.vendasMes.total)),
      subtitle: `${data.vendasMes.quantidade} vendas`,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "Condicionais Ativas",
      value: data.condicionaisAtivas.toString(),
      subtitle: "em andamento",
      icon: FileText,
      color: "text-purple-600",
    },
    {
      title: "Clientes",
      value: data.totalClientes.toString(),
      subtitle: "cadastrados",
      icon: Users,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="space-y-2">
        {data.condicionaisVencidas > 0 && (
          <Link
            href="/condicionais?status=VENCIDA"
            className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-red-800">
              <AlertTriangle className="h-5 w-5" />
              {data.condicionaisVencidas} condicional(is) vencida(s) sem retorno
            </span>
            <span className="text-xs text-red-700 underline">Ver condicionais</span>
          </Link>
        )}
        {data.estoqueBaixo > 0 && (
          <Link
            href="/estoque"
            className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 hover:bg-yellow-100"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-yellow-800">
              <Package className="h-5 w-5" />
              {data.estoqueBaixo} produto(s) com estoque baixo
            </span>
            <span className="text-xs text-yellow-700 underline">Ver estoque</span>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.vendasRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="divide-y">
              {data.vendasRecentes.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Venda #{v.numero}</p>
                    <p className="text-sm text-muted-foreground">
                      {v.cliente?.nome || "Consumidor"} · {formatDate(v.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(v.total))}</p>
                    <Badge variant="secondary">
                      {formaPagamentoLabel[v.formaPagamento]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
