"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ModalBaixa, type BaixaData } from "@/components/modal-baixa";
import {
  Plus, ArrowDownCircle, CheckCircle2, Loader2, Search, X,
  AlertTriangle, DollarSign, Clock, TrendingDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const CATEGORIAS: Record<string, string> = {
  ALUGUEL: "Aluguel", AGUA: "Água", LUZ: "Luz", TELEFONE: "Telefone",
  INTERNET: "Internet", FORNECEDOR: "Fornecedor", IMPOSTO: "Imposto",
  SALARIO: "Salário", PROLABORE: "Pró-labore", OUTRO: "Outro",
};

function diasAte(data: string | Date): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data); alvo.setHours(0, 0, 0, 0);
  return Math.floor((alvo.getTime() - hoje.getTime()) / 86400000);
}

function agingLabel(diff: number): { label: string; cls: string } {
  if (diff >= 0) {
    if (diff === 0) return { label: "Vence hoje", cls: "bg-amber-100 text-amber-800" };
    if (diff <= 7)  return { label: `Vence em ${diff}d`, cls: "bg-yellow-100 text-yellow-800" };
    return { label: `Vence em ${diff}d`, cls: "bg-blue-50 text-blue-700" };
  }
  const a = Math.abs(diff);
  if (a <= 30) return { label: `${a}d em atraso`, cls: "bg-red-100 text-red-700" };
  if (a <= 60) return { label: `${a}d em atraso`, cls: "bg-red-200 text-red-800" };
  if (a <= 90) return { label: `${a}d em atraso`, cls: "bg-red-300 text-red-900" };
  return { label: `+90d em atraso`, cls: "bg-red-600 text-white font-bold" };
}

function CardResumo({ title, value, sub, icon: Icon, cor }: {
  title: string; value: string; sub: string; icon: React.ElementType; cor: string;
}) {
  return (
    <Card className={`border-l-4 ${cor}`}>
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <div className="rounded-full bg-muted p-2 mt-0.5"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      </CardContent>
    </Card>
  );
}

export default function ContasPagarPage() {
  const [contas, setContas] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [fornecedorBusca, setFornecedorBusca] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [fornecedoresResult, setFornecedoresResult] = useState<any[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [contaBaixa, setContaBaixa] = useState<any | null>(null);

  function carregar(pg = page) {
    setCarregando(true);
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (filtroStatus) params.set("status", filtroStatus);
    if (filtroCategoria) params.set("categoria", filtroCategoria);
    if (fornecedorId) params.set("fornecedorId", fornecedorId);
    if (filtroPeriodo && dataInicio) params.set("startDate", dataInicio);
    if (filtroPeriodo && dataFim) params.set("endDate", dataFim);
    params.set("page", String(pg));

    Promise.all([
      fetch(`/api/contas-pagar/list?${params}`).then(r => r.ok ? r.json() : null),
      pg === 1 ? fetch("/api/contas-pagar/resumo").then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    ]).then(([lista, res]) => {
      if (lista) { setContas(lista.data ?? []); setTotal(lista.total ?? 0); setTotalPages(lista.totalPages ?? 0); }
      if (res) setResumo(res);
    }).finally(() => setCarregando(false));
  }

  useEffect(() => { const t = setTimeout(() => setBusca(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); carregar(1); }, [busca, filtroStatus, filtroCategoria, fornecedorId, filtroPeriodo, dataInicio, dataFim]);
  useEffect(() => { if (page > 1) carregar(page); }, [page]);

  // Busca fornecedores
  useEffect(() => {
    if (!fornecedorBusca.trim() || fornecedorId) { setFornecedoresResult([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/fornecedores?q=${encodeURIComponent(fornecedorBusca)}`);
      if (r.ok) { const d = await r.json(); setFornecedoresResult(Array.isArray(d) ? d.slice(0, 8) : []); }
    }, 300);
    return () => clearTimeout(t);
  }, [fornecedorBusca, fornecedorId]);

  const confirmarBaixa = async (dados: BaixaData) => {
    const r = await fetch(`/api/contas-pagar/${contaBaixa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Erro ao registrar"); }
    setContaBaixa(null);
    setPage(1); carregar(1);
  };

  const limpar = () => {
    setQ(""); setBusca(""); setFiltroStatus(""); setFiltroCategoria("");
    setFornecedorId(""); setFornecedorNome(""); setFornecedorBusca(""); setFornecedoresResult([]);
    setFiltroPeriodo(false); setDataInicio(""); setDataFim(""); setPage(1);
  };
  const temFiltro = busca || filtroStatus || filtroCategoria || fornecedorId || filtroPeriodo;

  return (
    <div className="space-y-6">
      {contaBaixa && (
        <ModalBaixa tipo="pagar"
          conta={{ descricao: contaBaixa.descricao, valor: Number(contaBaixa.valor), dataVencimento: contaBaixa.dataVencimento, fornecedor: contaBaixa.fornecedor }}
          onConfirmar={confirmarBaixa} onCancelar={() => setContaBaixa(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground">Gerencie suas despesas e obrigações</p>
        </div>
        <Button asChild>
          <Link href="/contas-pagar/novo"><Plus className="mr-2 h-4 w-4" /> Nova Conta</Link>
        </Button>
      </div>

      {/* Cards resumo */}
      {resumo && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardResumo title="A Pagar" icon={ArrowDownCircle} cor="border-l-orange-500"
            value={formatCurrency(resumo.totalPendente)}
            sub={`${resumo.qtdPendente} título${resumo.qtdPendente !== 1 ? "s" : ""} pendente${resumo.qtdPendente !== 1 ? "s" : ""}`} />
          <CardResumo title="Vencidas" icon={AlertTriangle} cor="border-l-red-500"
            value={formatCurrency(resumo.totalVencido)}
            sub={`${resumo.qtdVencido} título${resumo.qtdVencido !== 1 ? "s" : ""} em atraso`} />
          <CardResumo title="Vencem em 7 dias" icon={Clock} cor="border-l-amber-500"
            value={formatCurrency(resumo.venceSemana)}
            sub={`${resumo.qtdVenceSemana} título${resumo.qtdVenceSemana !== 1 ? "s" : ""} · hoje: ${formatCurrency(resumo.venceHoje)}`} />
          <CardResumo title="Pago este mês" icon={TrendingDown} cor="border-l-green-500"
            value={formatCurrency(resumo.pagoMes)}
            sub={`${resumo.qtdPagoMes} pagamento${resumo.qtdPagoMes !== 1 ? "s" : ""} no mês`} />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar descrição..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>

        {/* Filtro fornecedor */}
        <div className="relative min-w-[180px]">
          {fornecedorId ? (
            <div className="flex items-center gap-1 rounded-md border bg-orange-50 px-3 py-2 text-sm">
              <span className="font-medium text-orange-700">{fornecedorNome}</span>
              <button onClick={() => { setFornecedorId(""); setFornecedorNome(""); setFornecedorBusca(""); }}
                className="ml-1 text-orange-400 hover:text-orange-600"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar por fornecedor..." value={fornecedorBusca}
                onChange={e => setFornecedorBusca(e.target.value)} className="pl-9" />
              {fornecedoresResult.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full rounded-md border bg-white shadow-lg max-h-48 overflow-y-auto">
                  {fornecedoresResult.map((f: any) => (
                    <button key={f.id} onClick={() => { setFornecedorId(f.id); setFornecedorNome(f.nome); setFornecedorBusca(""); setFornecedoresResult([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm">
                      <p className="font-medium">{f.nome}</p>
                      {f.cnpj && <p className="text-xs text-muted-foreground">{f.cnpj}</p>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Paga</option>
        </select>

        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todas categorias</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <Button variant={filtroPeriodo ? "default" : "outline"} size="sm" onClick={() => setFiltroPeriodo(!filtroPeriodo)}>
          {filtroPeriodo ? "Filtrando por data" : "Por data"}
        </Button>
        {filtroPeriodo && (
          <>
            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-36" />
            <span className="text-muted-foreground text-sm">até</span>
            <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-36" />
          </>
        )}
        {temFiltro && <Button variant="ghost" size="sm" onClick={limpar}><X className="mr-1 h-4 w-4" /> Limpar</Button>}
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : contas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ArrowDownCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma conta encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">{temFiltro ? "Tente ajustar os filtros" : "Cadastre contas a pagar"}</p>
            {temFiltro ? <Button variant="outline" onClick={limpar}>Limpar filtros</Button>
              : <Button asChild><Link href="/contas-pagar/novo"><Plus className="mr-2 h-4 w-4" />Nova Conta</Link></Button>}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{total} conta{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}</p>

          {/* Desktop */}
          <Card className="hidden md:block">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fornecedor</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Situação</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contas.map(conta => {
                    const diff = diasAte(conta.dataVencimento);
                    const ag = conta.status === "PENDENTE" ? agingLabel(diff) : null;
                    return (
                      <tr key={conta.id} className={conta.status === "PAGO" ? "opacity-60" : diff < 0 && conta.status === "PENDENTE" ? "bg-red-50" : ""}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm">{conta.descricao}</p>
                          <p className="text-xs text-muted-foreground">{CATEGORIAS[conta.categoria] || conta.categoria}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{conta.fornecedor?.nome || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(conta.valor)}</td>
                        <td className="px-4 py-3 text-center text-sm">{new Date(conta.dataVencimento).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 text-center">
                          {conta.status === "PAGO" ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Paga
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Pendente</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {ag ? (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ag.cls}`}>
                              {diff < 0 && <AlertTriangle className="h-3 w-3" />}{ag.label}
                            </span>
                          ) : conta.status === "PAGO" ? (
                            <span className="text-xs text-muted-foreground">
                              {conta.dataPagamento ? new Date(conta.dataPagamento).toLocaleDateString("pt-BR") : "—"}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {conta.status !== "PAGO" && (
                              <Button variant="outline" size="sm"
                                className="text-orange-700 border-orange-300 hover:bg-orange-50"
                                onClick={() => setContaBaixa(conta)}>
                                <DollarSign className="mr-1 h-3.5 w-3.5" /> Pagar
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/contas-pagar/${conta.id}`}>Editar</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Mobile */}
          <div className="grid gap-3 md:hidden">
            {contas.map(conta => {
              const diff = diasAte(conta.dataVencimento);
              const ag = conta.status === "PENDENTE" ? agingLabel(diff) : null;
              return (
                <Card key={conta.id} className={conta.status === "PAGO" ? "opacity-60" : diff < 0 && conta.status === "PENDENTE" ? "border-red-400" : ""}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{conta.descricao}</p>
                        <p className="text-xs text-muted-foreground">{conta.fornecedor?.nome || CATEGORIAS[conta.categoria] || conta.categoria}</p>
                      </div>
                      <span className="text-lg font-bold">{formatCurrency(conta.valor)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 items-center">
                      {conta.status === "PAGO" ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Paga
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Pendente</span>
                      )}
                      {ag && <span className={`text-xs px-2 py-0.5 rounded-full ${ag.cls}`}>{ag.label}</span>}
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(conta.dataVencimento).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {conta.status !== "PAGO" && (
                      <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => setContaBaixa(conta)}>
                        <DollarSign className="mr-1.5 h-3.5 w-3.5" /> Registrar Pagamento
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
