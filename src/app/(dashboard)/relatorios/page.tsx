"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Periodo = "hoje" | "7d" | "30d" | "90d" | "ano";

const periodos: { label: string; value: Periodo }[] = [
  { label: "Hoje", value: "hoje" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
  { label: "Este ano", value: "ano" },
];

const CORES_PAGAMENTO: Record<string, string> = {
  DINHEIRO: "#22c55e",
  DEBITO: "#3b82f6",
  CREDITO: "#8b5cf6",
  PIX: "#10b981",
  BOLETO: "#f59e0b",
};

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState<any>(null);
  const [vendasPorDia, setVendasPorDia] = useState<any[]>([]);
  const [vendasPorPagamento, setVendasPorPagamento] = useState<any[]>([]);
  const [produtosTop, setProdutosTop] = useState<any[]>([]);
  const [condicionais, setCondicionais] = useState<any>(null);

  const fetchDados = useCallback(async () => {
    setCarregando(true);

    try {
      const [res, vendasDia, vendasPag, prodTop, cond] = await Promise.all([
        fetch(`/api/relatorios?tipo=resumo&periodo=${periodo}`).then((r) => r.json()),
        fetch(`/api/relatorios?tipo=vendas-por-dia&periodo=${periodo}`).then((r) => r.json()),
        fetch(`/api/relatorios?tipo=vendas-por-pagamento&periodo=${periodo}`).then((r) => r.json()),
        fetch(`/api/relatorios?tipo=produtos-mais-vendidos&periodo=${periodo}`).then((r) => r.json()),
        fetch(`/api/relatorios?tipo=condicionais&periodo=${periodo}`).then((r) => r.json()),
      ]);

      setResumo(res);
      setVendasPorDia(vendasDia);
      setVendasPorPagamento(vendasPag);
      setProdutosTop(prodTop);
      setCondicionais(cond);
    } catch {
      // silently fail
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Acompanhe o desempenho da sua loja
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {periodos.map((p) => (
          <Button
            key={p.value}
            variant={periodo === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vendas no período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{resumo?.totalVendas ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(resumo?.totalReceita ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Clientes cadastrados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{resumo?.totalClientes ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Produtos ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{resumo?.totalProdutos ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Condicionais ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{resumo?.condicionaisAtivas ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por dia</CardTitle>
              </CardHeader>
              <CardContent>
                {vendasPorDia.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma venda no período
                  </p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vendasPorDia}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="dia"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Receita"]}
                        />
                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vendas por forma de pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {vendasPorPagamento.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma venda no período
                  </p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={vendasPorPagamento}
                          dataKey="total"
                          nameKey="forma"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ forma, percent }) =>
                            `${forma} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {vendasPorPagamento.map((entry) => (
                            <Cell
                              key={entry.forma}
                              fill={CORES_PAGAMENTO[entry.forma] || "#6b7280"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Total"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Produtos mais vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                {produtosTop.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma venda no período
                  </p>
                ) : (
                  <div className="space-y-4">
                    {produtosTop.map((prod, index) => (
                      <div
                        key={prod.nome}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{prod.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {prod.quantidade} unidades
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium">
                          {formatCurrency(prod.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Condicionais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">
                      {condicionais?.ativas ?? 0}
                    </p>
                    <p className="text-sm text-emerald-700 font-medium">
                      Ativas
                    </p>
                  </div>

                  <div className="rounded-lg bg-red-50 p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {condicionais?.vencidas ?? 0}
                    </p>
                    <p className="text-sm text-red-700 font-medium">
                      Vencidas
                    </p>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {condicionais?.finalizadas ?? 0}
                    </p>
                    <p className="text-sm text-blue-700 font-medium">
                      Finalizadas
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <p className="text-3xl font-bold text-gray-600">
                      {condicionais?.canceladas ?? 0}
                    </p>
                    <p className="text-sm text-gray-700 font-medium">
                      Canceladas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
