"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowDownCircle, CheckCircle2, Loader2, Search, X, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const CATEGORIAS: Record<string, string> = {
  ALUGUEL: "Aluguel",
  AGUA: "Água",
  LUZ: "Luz",
  TELEFONE: "Telefone",
  INTERNET: "Internet",
  FORNECEDOR: "Fornecedor",
  IMPOSTO: "Imposto",
  SALARIO: "Salário",
  PROLABORE: "Pró-labore",
  OUTRO: "Outro",
};

function diasAte(data: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data);
  alvo.setHours(0, 0, 0, 0);
  return Math.floor((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ContasPagarPage() {
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  function carregar() {
    setCarregando(true);
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (filtroStatus) params.set("status", filtroStatus);
    if (filtroCategoria) params.set("categoria", filtroCategoria);
    if (filtroPeriodo) {
      if (dataInicio) params.set("startDate", dataInicio);
      if (dataFim) params.set("endDate", dataFim);
    }
    params.set("page", String(page));
    fetch(`/api/contas-pagar/list?${params}`)
      .then((r) => r.ok && r.json())
      .then((res) => {
        setContas(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 0);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, [page, busca, filtroStatus, filtroCategoria, filtroPeriodo, dataInicio, dataFim]);

  useEffect(() => {
    const t = setTimeout(() => setBusca(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(1); }, [busca, filtroStatus, filtroCategoria, filtroPeriodo, dataInicio, dataFim]);

  const handlePagar = useCallback(async (id: string) => {
    await fetch(`/api/contas-pagar/${id}`, { method: "PATCH" });
    carregar();
  }, []);

  function limparFiltros() {
    setQ("");
    setBusca("");
    setFiltroStatus("");
    setFiltroCategoria("");
    setFiltroPeriodo(false);
    setDataInicio("");
    setDataFim("");
    setPage(1);
  }

  const temFiltro = busca || filtroStatus || filtroCategoria || filtroPeriodo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground">Gerencie suas contas e despesas</p>
        </div>
        <Button asChild>
          <Link href="/contas-pagar/novo">
            <Plus className="mr-2 h-4 w-4" /> Nova Conta
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Paga</option>
        </select>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIAS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <Button
          variant={filtroPeriodo ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltroPeriodo(!filtroPeriodo)}
        >
          {filtroPeriodo ? "Filtrando por data" : "Filtrar por data"}
        </Button>
        {filtroPeriodo && (
          <>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-[140px]"
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-[140px]"
            />
          </>
        )}
        {temFiltro && (
          <Button variant="ghost" size="sm" onClick={limparFiltros}>
            <X className="mr-1 h-4 w-4" /> Limpar
          </Button>
        )}
      </div>

      {carregando ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : contas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ArrowDownCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma conta encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {temFiltro ? "Tente limpar os filtros" : "Cadastre contas a pagar para controlar suas despesas"}
            </p>
            {temFiltro ? (
              <Button variant="outline" onClick={limparFiltros}>Limpar filtros</Button>
            ) : (
              <Button asChild><Link href="/contas-pagar/novo"><Plus className="mr-2 h-4 w-4" /> Nova Conta</Link></Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{total} conta{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}</p>
          <div className="grid gap-4">
            {contas.map((conta) => {
              const diff = diasAte(conta.dataVencimento);
              const vencida = conta.status === "PENDENTE" && diff < 0;
              const venceHoje = conta.status === "PENDENTE" && diff === 0;

              return (
                <Card
                  key={conta.id}
                  className={
                    conta.status === "PAGO" ? "opacity-60"
                    : vencida ? "border-red-500"
                    : venceHoje ? "border-amber-400"
                    : ""
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{conta.descricao}</h3>
                          {conta.status === "PAGO" ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Paga
                            </span>
                          ) : vencida ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" /> Vencida há {Math.abs(diff)} dia{Math.abs(diff) !== 1 ? "s" : ""}
                            </span>
                          ) : venceHoje ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              Vence hoje
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              Pendente
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="font-semibold text-lg text-foreground">{formatCurrency(conta.valor)}</span>
                          <span>Vence: {new Date(conta.dataVencimento).toLocaleDateString("pt-BR")}</span>
                          <span>{CATEGORIAS[conta.categoria] || conta.categoria}</span>
                          {conta.fornecedor && <span>{conta.fornecedor.nome}</span>}
                          {diff > 0 && conta.status !== "PAGO" && (
                            <span className="text-muted-foreground">Faltam {diff} dia{diff !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {conta.status !== "PAGO" && (
                          <Button variant="outline" size="sm" onClick={() => handlePagar(conta.id)}>
                            <CheckCircle2 className="mr-1 h-4 w-4" /> Pagar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/contas-pagar/${conta.id}`}>Editar</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Próximo
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
