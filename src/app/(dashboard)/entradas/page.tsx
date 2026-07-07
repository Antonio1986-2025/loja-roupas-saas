import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Plus, Package, Building2, FileText, Eye } from "lucide-react";

async function getEntradas(tenantId: string) {
  return await prisma.entradaMercadoria.findMany({
    where: { tenantId },
    include: {
      fornecedor: { select: { nome: true } },
      itens: {
        select: {
          quantidade: true,
          custoFinal: true,
          variante: {
            select: {
              produto: { select: { nome: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export default async function EntradasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const entradas = await getEntradas(session.user.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entrada de Mercadorias</h1>
          <p className="text-muted-foreground">
            Registre a chegada de produtos no estoque
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/entradas/nova">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Entrada</span>
          </Link>
        </Button>
      </div>

      {entradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma entrada registrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Registre a chegada de mercadorias para atualizar o estoque
            </p>
            <Button asChild>
              <Link href="/entradas/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova Entrada
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entradas.map((entrada) => {
            const totalItens = entrada.itens.reduce((s, i) => s + i.quantidade, 0);
            const custoTotal = entrada.itens.reduce(
              (s, i) => s + (Number(i.custoFinal || 0) * i.quantidade),
              0
            );

            return (
              <Card key={entrada.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold">Entrada #{entrada.numero}</h3>
                        {entrada.numeroNFe && (
                          <span className="text-xs text-muted-foreground font-mono">
                            NF {entrada.numeroNFe}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(entrada.createdAt)}
                      </p>
                      {entrada.fornecedor && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Building2 className="h-4 w-4" />
                          {entrada.fornecedor.nome}
                        </div>
                      )}
                      {entrada.observacao && (
                        <p className="text-sm text-muted-foreground mt-1">{entrada.observacao}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{totalItens} itens</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Custo total: {formatCurrency(custoTotal)}
                      </p>
                      <div className="text-sm text-muted-foreground mt-1">
                        {entrada.itens.slice(0, 3).map((i) => (
                          <div key={i.variante.produto.nome}>
                            {i.quantidade}x {i.variante.produto.nome}
                          </div>
                        ))}
                        {entrada.itens.length > 3 && (
                          <div className="text-xs">+{entrada.itens.length - 3} outros</div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild className="mt-2">
                        <Link href={`/entradas/${entrada.id}`}>
                          <Eye className="mr-1 h-4 w-4" />
                          Detalhes
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
