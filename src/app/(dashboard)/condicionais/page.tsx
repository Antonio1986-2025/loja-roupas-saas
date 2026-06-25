import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listarVendasCondicionais } from "@/lib/services/venda-condicional.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, FileText, AlertTriangle } from "lucide-react";

const statusLabel: Record<string, { label: string; cls: string }> = {
  ATIVA: { label: "Ativa", cls: "bg-blue-500" },
  FINALIZADA: { label: "Finalizada", cls: "bg-green-500" },
  CANCELADA: { label: "Cancelada", cls: "bg-gray-400" },
};

export default async function CondicionaisPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const status = searchParams.status as
    | "ATIVA"
    | "FINALIZADA"
    | "CANCELADA"
    | "VENCIDA"
    | undefined;

  const { data } = await listarVendasCondicionais(session.user.tenantId, {
    status,
    limit: 100,
  });

  const agora = new Date();

  const filtros = [
    { key: undefined, label: "Todas" },
    { key: "ATIVA", label: "Ativas" },
    { key: "VENCIDA", label: "Vencidas" },
    { key: "FINALIZADA", label: "Finalizadas" },
    { key: "CANCELADA", label: "Canceladas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Condicionais</h1>
          <p className="text-muted-foreground">
            Roupas que o cliente levou para experimentar em casa
          </p>
        </div>
        <Button asChild>
          <Link href="/condicionais/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova Condicional
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Button
            key={f.label}
            variant={status === f.key || (!status && !f.key) ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={f.key ? `/condicionais?status=${f.key}` : "/condicionais"}>
              {f.label}
            </Link>
          </Button>
        ))}
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma condicional encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Registre os produtos que o cliente levou para experimentar
            </p>
            <Button asChild>
              <Link href="/condicionais/nova">
                <Plus className="mr-2 h-4 w-4" />
                Nova Condicional
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (<>
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nº</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cliente</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Itens</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Saída</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {data.map((c) => {
                    const vencida =
                      c.status === "ATIVA" && new Date(c.dataVencimento) < agora;
                    const totalItens = c.itens.reduce((s, i) => s + i.quantidade, 0);
                    const valor = c.itens.reduce((s, i) => s + Number(i.subtotal), 0);

                    return (
                      <tr key={c.id} className={vencida ? "bg-red-50" : ""}>
                        <td className="px-4 py-3 font-mono text-sm">#{c.numero}</td>
                        <td className="px-4 py-3 font-medium">{c.cliente?.nome || "—"}</td>
                        <td className="px-4 py-3 text-center">{totalItens}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(valor)}
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(c.dataSaida)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="flex items-center gap-1">
                            {vencida && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            {formatDate(c.dataVencimento)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {vencida ? (
                            <Badge className="bg-red-500">Vencida</Badge>
                          ) : (
                            <Badge className={statusLabel[c.status].cls}>
                              {statusLabel[c.status].label}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/condicionais/${c.id}`}>Ver</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:hidden">
          {data.map((c) => {
            const vencida =
              c.status === "ATIVA" && new Date(c.dataVencimento) < agora;
            const totalItens = c.itens.reduce((s, i) => s + i.quantidade, 0);
            const valor = c.itens.reduce((s, i) => s + Number(i.subtotal), 0);

            return (
              <Card key={c.id} className={vencida ? "border-red-400" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm">#{c.numero}</p>
                      <p className="font-medium">{c.cliente?.nome || "—"}</p>
                    </div>
                    {vencida ? (
                      <Badge className="bg-red-500">Vencida</Badge>
                    ) : (
                      <Badge className={statusLabel[c.status].cls}>
                        {statusLabel[c.status].label}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Itens: <strong>{totalItens}</strong></span>
                    <span className="text-right font-medium">{formatCurrency(valor)}</span>
                    <span>Saída: {formatDate(c.dataSaida)}</span>
                    <span className="text-right">
                      {vencida && <AlertTriangle className="h-3 w-3 inline text-red-500 mr-1" />}
                      Vence: {formatDate(c.dataVencimento)}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs" asChild>
                    <Link href={`/condicionais/${c.id}`}>Ver detalhes</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </>)}
    </div>
  );
}
