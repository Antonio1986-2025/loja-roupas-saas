"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, FileText, Loader2, AlertTriangle, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";

type OrcamentoItem = {
  id: string;
  numero: number;
  status: string;
  total: number;
  subtotal: number;
  desconto: number;
  dataValidade: string;
  formaPagamento: string | null;
  createdAt: string;
  cliente: { id: string; nome: string } | null;
  vendedor: { name: string };
  itens: { id: string }[];
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  ABERTO: { label: "Aberto", cls: "bg-blue-500" },
  CONVERTIDO: { label: "Convertido", cls: "bg-green-500" },
  CANCELADO: { label: "Cancelado", cls: "bg-gray-400" },
  EXPIRADO: { label: "Expirado", cls: "bg-red-500" },
};

const filtros = [
  { key: "", label: "Todos" },
  { key: "ABERTO", label: "Aberto" },
  { key: "CONVERTIDO", label: "Convertido" },
  { key: "CANCELADO", label: "Cancelado" },
  { key: "EXPIRADO", label: "Expirado" },
];

function getValidadeInfo(dataValidade: string, status: string) {
  if (status !== "ABERTO") return null;
  const dias = differenceInDays(new Date(dataValidade), new Date());
  if (dias < 0) return { label: "Expirado", warning: true };
  if (dias === 0) return { label: "Vence hoje", warning: true };
  if (dias <= 2) return { label: `Vence em ${dias} dia${dias === 1 ? "" : "s"}`, warning: true };
  return { label: `Vence em ${dias} dias`, warning: false };
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState("");

  const fetchOrcamentos = useCallback(async (p: number, st: string) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (st) params.set("status", st);

      const res = await fetch(`/api/orcamentos?${params}`);
      if (res.ok) {
        const json = await res.json();
        setOrcamentos(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchOrcamentos(1, statusFiltro);
  }, [statusFiltro, fetchOrcamentos]);

  useEffect(() => {
    if (page > 1) fetchOrcamentos(page, statusFiltro);
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">
            {carregando ? "Carregando..." : `${total} orçamento(s) encontrado(s)`}
          </p>
        </div>
        <Button asChild>
          <Link href="/orcamentos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Button
            key={f.label}
            variant={statusFiltro === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFiltro(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {carregando && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orcamentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {statusFiltro
                ? "Tente ajustar os filtros"
                : "Crie orçamentos para seus clientes"}
            </p>
            <Button asChild>
              <Link href="/orcamentos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Orçamento
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nº</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vendedor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Validade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Criado em</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y">
                    {orcamentos.map((orc) => {
                      const validadeInfo = getValidadeInfo(orc.dataValidade, orc.status);
                      const cfg = statusConfig[orc.status] ?? { label: orc.status, cls: "bg-gray-400" };
                      return (
                        <tr key={orc.id} className={validadeInfo?.warning ? "bg-orange-50" : ""}>
                          <td className="px-4 py-3 font-mono text-sm font-semibold">#{orc.numero}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{orc.cliente?.nome || "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{orc.vendedor.name}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(orc.total))}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${cfg.cls} text-white`}>{cfg.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="flex items-center gap-1">
                              {validadeInfo?.warning && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                              {validadeInfo ? (
                                <span className={validadeInfo.warning ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                                  {validadeInfo.label}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{formatDate(orc.dataValidade)}</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(orc.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/orcamentos/${orc.id}`}>Ver</Link>
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

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {orcamentos.map((orc) => {
              const validadeInfo = getValidadeInfo(orc.dataValidade, orc.status);
              const cfg = statusConfig[orc.status] ?? { label: orc.status, cls: "bg-gray-400" };
              return (
                <Link key={orc.id} href={`/orcamentos/${orc.id}`} className="block">
                  <Card className={`cursor-pointer hover:border-primary transition-colors ${validadeInfo?.warning ? "border-orange-400" : ""}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-sm font-semibold">#{orc.numero}</p>
                          <p className="font-medium">{orc.cliente?.nome || "—"}</p>
                          <p className="text-xs text-muted-foreground">{orc.vendedor.name}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={`${cfg.cls} text-white`}>{cfg.label}</Badge>
                          <p className="text-lg font-bold mt-1">{formatCurrency(Number(orc.total))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {validadeInfo?.warning && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {validadeInfo ? (
                          <span className={validadeInfo.warning ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                            {validadeInfo.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Válido até {formatDate(orc.dataValidade)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
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
