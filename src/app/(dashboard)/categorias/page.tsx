"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Tag, Package, Search, X, Loader2 } from "lucide-react";
import { DeleteCategoriaButton } from "@/components/delete-categoria-button";

type CategoriaItem = {
  id: string;
  nome: string;
  slug: string;
  totalProdutos: number;
  createdAt: string;
};

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  const fetchCategorias = useCallback(async (p: number, q: string) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (q) params.set("q", q);

      const res = await fetch(`/api/categorias/list?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCategorias(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchCategorias(1, busca);
  }, [busca, fetchCategorias]);

  useEffect(() => {
    if (page > 1) fetchCategorias(page, busca);
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">
            {carregando ? "Carregando..." : `${total} categoria(s) encontrada(s)`}
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/categorias/novo">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Categoria</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
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
      </div>

      {carregando && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : categorias.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Tag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {busca ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {busca ? "Tente ajustar a busca" : "Crie categorias para organizar seus produtos"}
            </p>
            {!busca && (
              <Button asChild>
                <Link href="/categorias/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Categoria
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((categoria) => (
              <Card key={categoria.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{categoria.nome}</h3>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        {categoria.totalProdutos}{" "}
                        {categoria.totalProdutos === 1 ? "produto" : "produtos"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/etiquetas?categoriaId=${categoria.id}`}>🏷️ Etiquetas</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/categorias/${categoria.id}`}>Editar</Link>
                      </Button>
                      <DeleteCategoriaButton categoriaId={categoria.id} />
                    </div>
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
                Pagina {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Proxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}