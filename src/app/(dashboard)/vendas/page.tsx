"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Loader2, Package, TrendingUp, Filter } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type VendaItem = {
  id: string;
  numero: number;
  status: string;
  total: number;
  formaPagamento: string;
  createdAt: string;
  cliente: { id: string; nome: string } | null;
  vendedor: { name: string };
  qtdItens: number;
};

const statusColors: Record<string, string> = {
  CONCLUIDA: "bg-green-500",
  CANCELADA: "bg-red-500",
  DEVOLVIDA: "bg-yellow-500",
};

const statusLabels: Record<string, string> = {
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  DEVOLVIDA: "Devolvida",
};

const formaLabels: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  PIX: "PIX",
  BOLETO: "Boleto",
  DUPLICATA: "Duplicata",
  CREDITO_LOJA: "Crédito Loja",
};

export default function VendasPage() {
  const [vendas, setVendas] = useState<VendaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [formaFiltro, setFormaFiltro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const fetchVendas = useCallback(async (
    p: number, q: string, st: string, fp: string, di: string, df: string
  ) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (q) params.set("q", q);
      if (st) params.set("status", st);
      if (fp) params.set("formaPagamento", fp);
      if (di) params.set("startDate", di);
      if (df) params.set("endDate", df);

      const res = await fetch(`/api/vendas/list?${params}`);
      if (res.ok) {
        const json = await res.json();
        setVendas(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchVendas(1, busca, statusFiltro, formaFiltro, dataInicio, dataFim);
  }, [busca, statusFiltro, formaFiltro, dataInicio, dataFim, fetchVendas]);

  useEffect(() => {
    if (page > 1) fetchVendas(page, busca, statusFiltro, formaFiltro, dataInicio, dataFim);
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">
            {carregando ? "Carregando..." : `${total} venda(s) encontrada(s)`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou nº da venda..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
          {busca && (
            <button onClick={() => setBusca("")} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
          <option value="DEVOLVIDA">Devolvida</option>
        </select>

        <select
          value={formaFiltro}
          onChange={(e) => setFormaFiltro(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas as formas</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="DEBITO">Débito</option>
          <option value="CREDITO">Crédito</option>
          <option value="BOLETO">Boleto</option>
          <option value="DUPLICATA">Duplicata</option>
          <option value="CREDITO_LOJA">Crédito Loja</option>
        </select>
      </div>

      {filtrosAbertos && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-md border bg-muted/30">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" onClick={() => { setDataInicio(""); setDataFim(""); }} className="mt-5">
              <X className="h-4 w-4 mr-1" />
              Limpar datas
            </Button>
          )}
        </div>
      )}

      {carregando && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : vendas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {busca || statusFiltro || formaFiltro || dataInicio || dataFim
                ? "Nenhuma venda encontrada"
                : "Nenhuma venda registrada"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {busca || statusFiltro || formaFiltro || dataInicio || dataFim
                ? "Tente ajustar os filtros"
                : "As vendas realizadas no PDV aparecerão aqui"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {vendas.map((venda) => (
              <Link key={venda.id} href={`/vendas/${venda.id}`} className="block">
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">Venda #{venda.numero}</h3>
                          <Badge className={statusColors[venda.status]}>
                            {statusLabels[venda.status] || venda.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(venda.createdAt)}
                        </p>
                        {venda.cliente && (
                          <p className="text-sm">Cliente: {venda.cliente.nome}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Vendedor: {venda.vendedor.name} &middot; {venda.qtdItens} item(ns)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {formatCurrency(venda.total)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formaLabels[venda.formaPagamento] || venda.formaPagamento}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-2">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
