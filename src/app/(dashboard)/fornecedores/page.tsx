"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, Phone, Mail, MapPin, Search, Loader2 } from "lucide-react";

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");

  function carregar() {
    setCarregando(true);
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    params.set("page", String(page));
    fetch(`/api/fornecedores/list?${params}`)
      .then((r) => r.ok && r.json())
      .then((res) => {
        setFornecedores(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 0);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, [page, busca]);

  useEffect(() => {
    const t = setTimeout(() => setBusca(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(1); }, [busca]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores cadastrados</p>
        </div>
        <Button asChild>
          <Link href="/fornecedores/novo">
            <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CNPJ ou cidade..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {carregando ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : fornecedores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {busca ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {busca ? "Tente buscar por outro termo" : "Comece cadastrando seu primeiro fornecedor"}
            </p>
            {busca ? (
              <Button variant="outline" onClick={() => { setQ(""); setBusca(""); }}>Limpar busca</Button>
            ) : (
              <Button asChild><Link href="/fornecedores/novo"><Plus className="mr-2 h-4 w-4" /> Cadastrar Fornecedor</Link></Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{total} fornecedor{total !== 1 ? "es" : ""} encontrado{total !== 1 ? "s" : ""}</p>
          <div className="grid gap-4">
            {fornecedores.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{f.nome}</h3>
                      <div className="mt-2 space-y-1">
                        {f.cnpj && <p className="text-sm text-muted-foreground">CNPJ: {f.cnpj}</p>}
                        {f.telefone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" /> {f.telefone}
                          </div>
                        )}
                        {f.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" /> {f.email}
                          </div>
                        )}
                        {(f.cidade || f.estado) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" /> {[f.cidade, f.estado].filter(Boolean).join(" - ")}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/fornecedores/${f.id}`}>Editar</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
