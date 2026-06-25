"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUpCircle, ArrowDownCircle, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Periodo = "7d" | "30d" | "90d" | "ano";

const periodos = [
  { label: "7 dias", value: "7d" as Periodo },
  { label: "30 dias", value: "30d" as Periodo },
  { label: "90 dias", value: "90d" as Periodo },
  { label: "Este ano", value: "ano" as Periodo },
];

export default function FluxoCaixaPage() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState<any>(null);

  const [movPage, setMovPage] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(0);
  const [movTipo, setMovTipo] = useState("");
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [carregandoMov, setCarregandoMov] = useState(false);

  const fetchDados = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/fluxo-caixa?tipo=resumo&periodo=${periodo}`).then((r) => r.json());
      setResumo(r);
    } catch { /* silent */ }
    finally { setCarregando(false); }
  }, [periodo]);

  const fetchMovimentacoes = useCallback(async () => {
    setCarregandoMov(true);
    try {
      const params = new URLSearchParams();
      params.set("periodo", periodo);
      params.set("page", String(movPage));
      params.set("limit", "10");
      if (movTipo) params.set("tipo", movTipo);
      const res = await fetch(`/api/fluxo-caixa/movimentacoes?${params}`).then((r) => r.json());
      setMovimentacoes(res.data || []);
      setMovTotalPages(res.totalPages || 0);
    } catch { /* silent */ }
    finally { setCarregandoMov(false); }
  }, [periodo, movPage, movTipo]);

  useEffect(() => { fetchDados(); }, [fetchDados]);
  useEffect(() => { fetchMovimentacoes(); }, [fetchMovimentacoes]);
  useEffect(() => { setMovPage(1); }, [periodo, movTipo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
        <p className="text-muted-foreground">Acompanhe entradas, saídas e saldo</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {periodos.map((p) => (
          <Button key={p.value} variant={periodo === p.value ? "default" : "outline"} size="sm" onClick={() => setPeriodo(p.value)}>
            {p.label}
          </Button>
        ))}
      </div>

      {carregando ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <p className={`text-2xl font-bold ${(resumo?.saldoAtual ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(resumo?.saldoAtual ?? 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Entradas no Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(resumo?.totalEntradas ?? 0)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saídas no Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-red-500" />
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(resumo?.totalSaidas ?? 0)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  <p className={`text-2xl font-bold ${(resumo?.saldoPeriodo ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(resumo?.saldoPeriodo ?? 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contas Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-amber-50 p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{formatCurrency(resumo?.totalPendentePagar ?? 0)}</p>
                    <p className="text-sm text-amber-700 font-medium">A Pagar</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{formatCurrency(resumo?.totalPendenteReceber ?? 0)}</p>
                    <p className="text-sm text-emerald-700 font-medium">A Receber</p>
                  </div>
                  <div className="rounded-lg col-span-2 bg-blue-50 p-4 text-center">
                    <p className={`text-3xl font-bold ${(resumo?.saldoPendente ?? 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      {formatCurrency(resumo?.saldoPendente ?? 0)}
                    </p>
                    <p className="text-sm text-blue-700 font-medium">Saldo Previsto</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Movimentações</CardTitle>
                  <select
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value)}
                    className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="">Todas</option>
                    <option value="ENTRADA">Entradas</option>
                    <option value="SAIDA">Saídas</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {carregandoMov ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : movimentacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação</p>
                ) : (
                  <div className="space-y-3">
                    {movimentacoes.map((mov: any) => (
                      <div key={`${mov.tipo}-${mov.id}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {mov.tipo === "ENTRADA" ? (
                            <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{mov.descricao}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(mov.data).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-medium ${mov.tipo === "ENTRADA" ? "text-emerald-600" : "text-red-600"}`}>
                          {mov.tipo === "ENTRADA" ? "+" : "-"}{formatCurrency(mov.valor)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {movTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={movPage <= 1} onClick={() => setMovPage(movPage - 1)}>
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">{movPage} de {movTotalPages}</span>
                    <Button variant="outline" size="sm" disabled={movPage >= movTotalPages} onClick={() => setMovPage(movPage + 1)}>
                      Próximo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {resumo?.totalPendentePagar > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Você tem {formatCurrency(resumo.totalPendentePagar)} em contas a pagar pendentes
                  </p>
                  <p className="text-xs text-amber-700">
                    Acesse <a href="/contas-pagar" className="underline">Contas a Pagar</a> para gerenciar
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
