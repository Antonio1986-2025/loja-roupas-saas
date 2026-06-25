"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

type CaixaItem = {
  id: string;
  usuarioNome: string;
  dataAbertura: string;
  dataFechamento: string;
  saldoInicial: number;
  saldoFinal: number | null;
  saldoReal: number | null;
  diferenca: number | null;
  totalVendas: number;
};

export default function HistoricoCaixaPage() {
  const [data, setData] = useState<CaixaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    fetch(`/api/caixa/historico?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data || []);
        setTotalPages(json.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Histórico de Caixas</h1>
        <Button variant="outline" asChild>
          <Link href="/caixa">Voltar ao Caixa</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Nenhum caixa fechado encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Data Abertura</th>
                      <th className="text-left p-3 font-medium">Data Fechamento</th>
                      <th className="text-left p-3 font-medium">Operador</th>
                      <th className="text-right p-3 font-medium">Saldo Inicial</th>
                      <th className="text-right p-3 font-medium">Esperado</th>
                      <th className="text-right p-3 font-medium">Real</th>
                      <th className="text-right p-3 font-medium">Diferença</th>
                      <th className="text-right p-3 font-medium">Vendas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{formatDateTime(c.dataAbertura)}</td>
                        <td className="p-3">{formatDateTime(c.dataFechamento)}</td>
                        <td className="p-3">{c.usuarioNome}</td>
                        <td className="p-3 text-right">{formatCurrency(c.saldoInicial)}</td>
                        <td className="p-3 text-right">{c.saldoFinal !== null ? formatCurrency(c.saldoFinal) : "—"}</td>
                        <td className="p-3 text-right">{c.saldoReal !== null ? formatCurrency(c.saldoReal) : "—"}</td>
                        <td className={`p-3 text-right font-medium ${c.diferenca !== null ? (c.diferenca >= 0 ? "text-green-600" : "text-destructive") : ""}`}>
                          {c.diferenca !== null
                            ? `${c.diferenca >= 0 ? "+" : ""}${formatCurrency(c.diferenca)}`
                            : "—"}
                        </td>
                        <td className="p-3 text-right">{c.totalVendas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 md:hidden">
                {data.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Abertura: {formatDateTime(c.dataAbertura)}</span>
                        <span>Fechamento: {formatDateTime(c.dataFechamento)}</span>
                      </div>
                      <div className="text-sm font-medium">{c.usuarioNome}</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span>Saldo Inicial: <strong>{formatCurrency(c.saldoInicial)}</strong></span>
                        <span className="text-right">Esperado: <strong>{c.saldoFinal !== null ? formatCurrency(c.saldoFinal) : "—"}</strong></span>
                        <span>Real: <strong>{c.saldoReal !== null ? formatCurrency(c.saldoReal) : "—"}</strong></span>
                        <span className="text-right">
                          Diferença:{" "}
                          <strong className={c.diferenca !== null ? (c.diferenca >= 0 ? "text-green-600" : "text-destructive") : ""}>
                            {c.diferenca !== null ? `${c.diferenca >= 0 ? "+" : ""}${formatCurrency(c.diferenca)}` : "—"}
                          </strong>
                        </span>
                      </div>
                      <div className="text-xs text-right">Vendas: <strong>{c.totalVendas}</strong></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
