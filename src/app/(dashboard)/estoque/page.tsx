"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, X, Loader2, AlertTriangle, Package, DollarSign,
  Layers, TrendingDown, Eye, PackageOpen,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AjusteEstoqueModal } from "@/components/ajuste-estoque-modal";
import { HistoricoEstoqueModal } from "@/components/historico-estoque-modal";

type VarianteItem = {
  id: string;
  produtoId: string;
  produtoNome: string;
  categoriaNome: string | null;
  cor: string | null;
  tamanho: string | null;
  codigoBarras: string;
  qtdEstoque: number;
  qtdDisponivel: number;
  qtdCondicional: number;
  estoqueMinimo: number;
  precoVenda: number;
  situacao: "zerado" | "baixo" | "normal" | "excesso";
};

type Resumo = {
  totalUnidades: number;
  valorTotal: number;
  totalVariantes: number;
  totalBaixo: number;
  totalZerado: number;
  categorias: { nome: string; total: number }[];
};

const SITUACAO_LABEL: Record<string, string> = {
  baixo: "Baixo",
  zerado: "Zerado",
  normal: "Normal",
  excesso: "Excesso",
};

const SITUACAO_COR: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
  baixo: "destructive",
  zerado: "secondary",
  normal: "default",
  excesso: "outline",
};

export default function EstoquePage() {
  const [variantes, setVariantes] = useState<VarianteItem[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [generoFiltro, setGeneroFiltro] = useState("");
  const [situacaoFiltro, setSituacaoFiltro] = useState("");
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [ajusteVariante, setAjusteVariante] = useState<VarianteItem | null>(null);
  const [historicoVariante, setHistoricoVariante] = useState<VarianteItem | null>(null);

  useEffect(() => {
    fetch("/api/estoque/resumo").then(async (r) => {
      if (r.ok) {
        const json = await r.json();
        setResumo(json);
      }
    }).catch(() => {});
    fetch("/api/categorias").then(async (r) => {
      if (r.ok) {
        const json = await r.json();
        if (Array.isArray(json)) setCategorias(json);
        else if (json.data) setCategorias(json.data);
      }
    }).catch(() => {});
  }, []);

  const fetchVariantes = useCallback(async (p: number, q: string, catId: string, gen: string, sit: string) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "50");
      if (q) params.set("q", q);
      if (catId) params.set("categoriaId", catId);
      if (gen) params.set("genero", gen);
      if (sit) params.set("situacao", sit);

      const res = await fetch(`/api/estoque/list?${params}`);
      if (res.ok) {
        const json = await res.json();
        setVariantes(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchVariantes(1, busca, categoriaFiltro, generoFiltro, situacaoFiltro);
  }, [busca, categoriaFiltro, generoFiltro, situacaoFiltro, fetchVariantes]);

  useEffect(() => {
    if (page > 1) fetchVariantes(page, busca, categoriaFiltro, generoFiltro, situacaoFiltro);
  }, [page]);

  const generos = [
    { value: "", label: "Todos" },
    { value: "MASCULINO", label: "Masculino" },
    { value: "FEMININO", label: "Feminino" },
    { value: "UNISSEX", label: "Unissex" },
    { value: "INFANTIL", label: "Infantil" },
  ];

  const situacoes = [
    { value: "", label: "Todos" },
    { value: "baixo", label: "Estoque Baixo" },
    { value: "zerado", label: "Zerado" },
    { value: "normal", label: "Normal" },
    { value: "excesso", label: "Excesso" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Estoque</h1>
        <p className="text-muted-foreground">
          {carregando ? "Carregando..." : `${total} variação(ões) encontrada(s)`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total em Estoque</div>
                <div className="text-2xl font-bold mt-1">{resumo?.totalUnidades ?? "-"} unid.</div>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Valor Total</div>
                <div className="text-2xl font-bold mt-1">{resumo ? formatCurrency(resumo.valorTotal) : "-"}</div>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  Estoque Baixo
                </div>
                <div className="text-2xl font-bold mt-1 text-destructive">{resumo?.totalBaixo ?? "-"}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <PackageOpen className="h-3 w-3" />
                  Zerados
                </div>
                <div className="text-2xl font-bold mt-1 text-muted-foreground">{resumo?.totalZerado ?? "-"}</div>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {resumo && resumo.categorias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resumo.categorias.map((cat) => {
            const catObj = categorias.find((c) => c.nome === cat.nome);
            const catId = catObj?.id || cat.nome;
            const ativo = categoriaFiltro === catId;
            return (
              <button
                key={cat.nome}
                onClick={() => setCategoriaFiltro(ativo ? "" : catId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  ativo
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat.nome}
                <span className="opacity-70">({cat.total})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou barras..."
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
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nome}</option>
          ))}
        </select>

        <select
          value={generoFiltro}
          onChange={(e) => setGeneroFiltro(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {generos.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>

        <select
          value={situacaoFiltro}
          onChange={(e) => setSituacaoFiltro(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {situacoes.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {carregando && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : variantes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma variação encontrada
            </h3>
            <p className="text-sm text-muted-foreground">
              {busca || categoriaFiltro || generoFiltro || situacaoFiltro
                ? "Tente ajustar os filtros"
                : "Nenhum produto cadastrado no estoque"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Produto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Variação</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Código</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Estoque</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Disp.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Mín.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Preço</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {variantes.map((v) => (
                      <tr key={v.id} className={v.situacao === "baixo" || v.situacao === "zerado" ? "bg-yellow-50" : ""}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-sm">{v.produtoNome}</div>
                          {v.categoriaNome && (
                            <div className="text-xs text-muted-foreground">{v.categoriaNome}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {v.cor && <span>{v.cor}</span>}
                          {v.cor && v.tamanho && <span> / </span>}
                          {v.tamanho && <span>{v.tamanho}</span>}
                          {!v.cor && !v.tamanho && <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono">{v.codigoBarras}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">{v.qtdEstoque}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          <span className={v.qtdDisponivel < v.qtdEstoque ? "text-orange-600 font-medium" : ""}>
                            {v.qtdDisponivel}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs text-muted-foreground">{v.estoqueMinimo}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(v.precoVenda)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <Badge variant={SITUACAO_COR[v.situacao]} className="text-[10px]">
                            {SITUACAO_LABEL[v.situacao]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAjusteVariante(v)} title="Ajustar estoque">
                              <Layers className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoricoVariante(v)} title="Ver histórico">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:hidden">
            {variantes.map((v) => (
              <Card key={v.id} className={v.situacao === "baixo" || v.situacao === "zerado" ? "border-yellow-400" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{v.produtoNome}</p>
                      {v.categoriaNome && <p className="text-xs text-muted-foreground">{v.categoriaNome}</p>}
                    </div>
                    <Badge variant={SITUACAO_COR[v.situacao]} className="text-[10px]">
                      {SITUACAO_LABEL[v.situacao]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mb-3">
                    {(v.cor || v.tamanho) && (
                      <span>Var: {[v.cor, v.tamanho].filter(Boolean).join(" / ")}</span>
                    )}
                    <span className="text-right font-mono">{v.codigoBarras}</span>
                    <span>Estq: <strong>{v.qtdEstoque}</strong></span>
                    <span className="text-right">Disp: <strong className={v.qtdDisponivel < v.qtdEstoque ? "text-orange-600" : ""}>{v.qtdDisponivel}</strong></span>
                    <span>Mín: {v.estoqueMinimo}</span>
                    <span className="text-right font-medium">{formatCurrency(v.precoVenda)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setAjusteVariante(v)}>
                      <Layers className="h-3 w-3 mr-1" /> Ajustar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setHistoricoVariante(v)}>
                      <Eye className="h-3 w-3 mr-1" /> Histórico
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-2">
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      {ajusteVariante && (
        <AjusteEstoqueModal
          varianteId={ajusteVariante.id}
          produtoNome={ajusteVariante.produtoNome}
          cor={ajusteVariante.cor}
          tamanho={ajusteVariante.tamanho}
          qtdAtual={ajusteVariante.qtdEstoque}
          open={!!ajusteVariante}
          onOpenChange={(v) => { if (!v) setAjusteVariante(null); }}
          onSuccess={() => {
            fetchVariantes(page, busca, categoriaFiltro, generoFiltro, situacaoFiltro);
            fetch("/api/estoque/resumo").then((r) => r.ok && r.json()).then(setResumo).catch(() => {});
          }}
        />
      )}

      {historicoVariante && (
        <HistoricoEstoqueModal
          varianteId={historicoVariante.id}
          produtoNome={`${historicoVariante.produtoNome}${historicoVariante.cor ? ` — ${historicoVariante.cor}` : ""}${historicoVariante.tamanho ? ` / ${historicoVariante.tamanho}` : ""}`}
          open={!!historicoVariante}
          onOpenChange={(v) => { if (!v) setHistoricoVariante(null); }}
        />
      )}
    </div>
  );
}
