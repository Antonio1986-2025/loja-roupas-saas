"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Search, Edit, Loader2, X, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DeleteProdutoButton } from "@/components/delete-produto-button";
import { ImportProdutosButton } from "@/components/import-produtos-button";
import { ProdutoImage } from "@/components/produto-image";

type ProdutoItem = {
  id: string;
  nome: string;
  marca: string | null;
  genero: string | null;
  codigoInterno: string | null;
  precoVenda: number;
  totalEstoque: number;
  qtdVariantes: number;
  estoqueBaixo: boolean;
  estoqueZerado: boolean;
  fotoUrl: string | null;
  categoria: { nome: string } | null;
};

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [generoFiltro, setGeneroFiltro] = useState("");
  const [estoqueBaixoFiltro, setEstoqueBaixoFiltro] = useState(false);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    fetch("/api/categorias").then(async (res) => {
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) setCategorias(json);
        else if (json.data) setCategorias(json.data);
      }
    }).catch(() => {});
  }, []);

  const fetchProdutos = useCallback(async (p: number, q: string, catId: string, gen: string, estBaixo: boolean) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (q) params.set("q", q);
      if (catId) params.set("categoriaId", catId);
      if (gen) params.set("genero", gen);
      if (estBaixo) params.set("estoqueBaixo", "true");

      const res = await fetch(`/api/produtos/list?${params}`);
      if (res.ok) {
        const json = await res.json();
        setProdutos(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProdutos(1, busca, categoriaFiltro, generoFiltro, estoqueBaixoFiltro);
  }, [busca, categoriaFiltro, generoFiltro, estoqueBaixoFiltro, fetchProdutos]);

  useEffect(() => {
    if (page > 1) fetchProdutos(page, busca, categoriaFiltro, generoFiltro, estoqueBaixoFiltro);
  }, [page]);

  const generos = [
    { value: "", label: "Todos" },
    { value: "MASCULINO", label: "Masculino" },
    { value: "FEMININO", label: "Feminino" },
    { value: "UNISSEX", label: "Unissex" },
    { value: "INFANTIL", label: "Infantil" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            {carregando ? "Carregando..." : `${total} produto(s) encontrado(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <ImportProdutosButton />
          <Button asChild>
            <Link href="/produtos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou referência..."
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

        <button
          onClick={() => setEstoqueBaixoFiltro(!estoqueBaixoFiltro)}
          className={`h-10 px-3 rounded-md border text-sm transition-colors ${
            estoqueBaixoFiltro
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-background text-muted-foreground border-input hover:bg-accent"
          }`}
        >
          Estoque Baixo
        </button>
      </div>

      {carregando && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : produtos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {busca || categoriaFiltro || generoFiltro || estoqueBaixoFiltro
                ? "Nenhum produto encontrado"
                : "Nenhum produto cadastrado"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {busca || categoriaFiltro || generoFiltro || estoqueBaixoFiltro
                ? "Tente ajustar os filtros ou limpar a busca"
                : "Comece cadastrando seu primeiro produto"}
            </p>
            {!busca && !categoriaFiltro && !generoFiltro && !estoqueBaixoFiltro && (
              <Button asChild>
                <Link href="/produtos/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Produto
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {produtos.map((produto) => (
              <Card key={produto.id} className="overflow-hidden">
                <div className="aspect-square relative bg-gray-100">
                  {produto.fotoUrl ? (
                    <ProdutoImage src={produto.fotoUrl} alt={produto.nome} />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  {produto.estoqueBaixo && (
                    <Badge variant="destructive" className="absolute top-2 left-2 text-[10px]">
                      Estoque Baixo
                    </Badge>
                  )}
                  {produto.estoqueZerado && !produto.estoqueBaixo && (
                    <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-100">
                      Sem Estoque
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{produto.nome}</CardTitle>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {produto.marca && (
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        {produto.marca}
                      </span>
                    )}
                    {produto.categoria && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                        {produto.categoria.nome}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {produto.codigoInterno && (
                    <p className="text-xs text-muted-foreground border-b pb-3">
                      <span className="font-medium text-foreground/60">Cód:</span>{" "}
                      <span className="font-mono">{produto.codigoInterno}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatCurrency(produto.precoVenda)}
                    </span>
                    <div className="text-right">
                      <span className={`text-sm ${
                        produto.estoqueBaixo ? "text-destructive font-medium" : "text-muted-foreground"
                      }`}>
                        Estoque: {produto.totalEstoque}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {produto.qtdVariantes} variação(ões)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/produtos/${produto.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                    <DeleteProdutoButton produtoId={produto.id} />
                  </div>
                </CardContent>
              </Card>
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
