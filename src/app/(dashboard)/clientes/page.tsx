"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Loader2, Users, Phone, Mail, ShoppingBag, Wallet, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type ClienteItem = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  creditoAtual: number;
  totalVendas: number;
  createdAt: string;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [orderBy, setOrderBy] = useState<"nome" | "data">("nome");

  const fetchClientes = useCallback(async (p: number, q: string, ord: string) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (q) params.set("q", q);
      if (ord) params.set("orderBy", ord);

      const res = await fetch(`/api/clientes/list?${params}`);
      if (res.ok) {
        const json = await res.json();
        setClientes(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchClientes(1, busca, orderBy);
  }, [busca, orderBy, fetchClientes]);

  useEffect(() => {
    if (page > 1) fetchClientes(page, busca, orderBy);
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {carregando ? "Carregando..." : `${total} cliente(s) encontrado(s)`}
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/clientes/novo">
            <Users className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou telefone..."
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => setOrderBy(orderBy === "nome" ? "data" : "nome")}
          className="h-10"
        >
          <ArrowUpDown className="mr-2 h-4 w-4" />
          {orderBy === "nome" ? "Nome" : "Data"}
        </Button>
      </div>

      {carregando && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : clientes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {busca ? "Tente ajustar a busca" : "Comece cadastrando seu primeiro cliente"}
            </p>
            {!busca && (
              <Button asChild>
                <Link href="/clientes/novo">
                  <Users className="mr-2 h-4 w-4" />
                  Cadastrar Cliente
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {clientes.map((cliente) => (
              <Card key={cliente.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold truncate">{cliente.nome}</h3>
                        {cliente.creditoAtual > 0 && (
                          <Badge className="bg-yellow-500 text-[10px] shrink-0">
                            Crédito: {formatCurrency(cliente.creditoAtual)}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {cliente.telefone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 shrink-0" />
                            {cliente.telefone}
                          </div>
                        )}
                        {cliente.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate">{cliente.email}</span>
                          </div>
                        )}
                        {cliente.cpf && (
                          <p className="text-sm text-muted-foreground">
                            CPF: {cliente.cpf}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground mb-1">
                        <ShoppingBag className="h-4 w-4" />
                        {cliente.totalVendas} venda(s)
                      </div>
                      {cliente.creditoAtual > 0 && (
                        <div className="flex items-center justify-end gap-1 text-sm text-yellow-600 font-medium">
                          <Wallet className="h-4 w-4" />
                          {formatCurrency(cliente.creditoAtual)}
                        </div>
                      )}
                      <Button variant="outline" size="sm" asChild className="mt-3">
                        <Link href={`/clientes/${cliente.id}`}>Ver Detalhes</Link>
                      </Button>
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
