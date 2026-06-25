"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Search, Trash2, Plus, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type Cliente = { id: string; nome: string; telefone: string | null; cpf: string | null };
type Variante = {
  id: string;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  codigoBarras: string;
  preco: number;
  qtdDisponivel: number;
};
type ItemCarrinho = Variante & { quantidade: number };

export default function NovaCondicionalPage() {
  const router = useRouter();

  const [clienteBusca, setClienteBusca] = useState("");
  const [clientesResult, setClientesResult] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);

  const [prodBusca, setProdBusca] = useState("");
  const [prodResult, setProdResult] = useState<Variante[]>([]);
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const [prazoDias, setPrazoDias] = useState(5);
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Busca de clientes (debounce)
  useEffect(() => {
    if (clienteSel) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clientes/search?q=${encodeURIComponent(clienteBusca)}`);
      if (res.ok) setClientesResult(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [clienteBusca, clienteSel]);

  // Busca de produtos (debounce)
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/produtos/search?q=${encodeURIComponent(prodBusca)}`);
      if (res.ok) setProdResult(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [prodBusca]);

  const addItem = useCallback((v: Variante) => {
    setItens((prev) => {
      const existe = prev.find((i) => i.id === v.id);
      if (existe) {
        return prev.map((i) =>
          i.id === v.id ? { ...i, quantidade: Math.min(i.quantidade + 1, v.qtdDisponivel) } : i
        );
      }
      return [...prev, { ...v, quantidade: 1 }];
    });
  }, []);

  const removeItem = (id: string) => setItens((prev) => prev.filter((i) => i.id !== id));

  const setQtd = (id: string, qtd: number) =>
    setItens((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantidade: Math.max(1, Math.min(qtd, i.qtdDisponivel)) } : i
      )
    );

  const total = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);

  const salvar = async () => {
    setErro("");
    if (!clienteSel) return setErro("Selecione um cliente");
    if (itens.length === 0) return setErro("Adicione ao menos um produto");

    setSalvando(true);
    const res = await fetch("/api/condicionais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: clienteSel.id,
        prazoDias,
        observacoes: observacoes || undefined,
        itens: itens.map((i) => ({ varianteId: i.id, quantidade: i.quantidade })),
      }),
    });
    setSalvando(false);

    if (res.ok) {
      const data = await res.json();
      router.push(`/condicionais/${data.id}`);
    } else {
      const err = await res.json();
      setErro(err.message || "Erro ao criar condicional");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/condicionais">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Condicional</h1>
          <p className="text-muted-foreground">Registre os produtos que o cliente vai levar</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clienteSel ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{clienteSel.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {clienteSel.telefone || clienteSel.cpf || "—"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setClienteSel(null)}>
                  Trocar
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nome, CPF ou telefone"
                    value={clienteBusca}
                    onChange={(e) => setClienteBusca(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {clientesResult.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setClienteSel(c)}
                      className="w-full text-left rounded-md p-2 hover:bg-accent text-sm"
                    >
                      <span className="font-medium">{c.nome}</span>
                      <span className="text-muted-foreground"> — {c.telefone || c.cpf || "—"}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Prazo e observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo de devolução (dias)</Label>
              <Input
                id="prazo"
                type="number"
                min={1}
                max={30}
                value={prazoDias}
                onChange={(e) => setPrazoDias(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Input
                id="obs"
                placeholder="Opcional"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Produtos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou código de barras"
              value={prodBusca}
              onChange={(e) => setProdBusca(e.target.value)}
            />
          </div>

          {prodResult.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
              {prodResult.map((v) => (
                <button
                  key={v.id}
                  onClick={() => addItem(v)}
                  disabled={v.qtdDisponivel <= 0}
                  className="w-full text-left p-2 hover:bg-accent text-sm flex items-center justify-between disabled:opacity-40"
                >
                  <span>
                    <span className="font-medium">{v.nome}</span>
                    {v.cor && <span className="text-muted-foreground"> · {v.cor}</span>}
                    {v.tamanho && <span className="text-muted-foreground"> · {v.tamanho}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground">Disp: {v.qtdDisponivel}</span>
                    <span className="font-medium">{formatCurrency(v.preco)}</span>
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {itens.length > 0 && (
            <div className="rounded-md border divide-y">
              {itens.map((i) => (
                <div key={i.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <p className="font-medium">{i.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {[i.cor, i.tamanho].filter(Boolean).join(" · ") || "—"} ·{" "}
                      {formatCurrency(i.preco)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={i.qtdDisponivel}
                    value={i.quantidade}
                    onChange={(e) => setQtd(i.id, Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="w-24 text-right font-medium">
                    {formatCurrency(i.preco * i.quantidade)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold">{formatCurrency(total)}</span>
          </div>
        </CardContent>
      </Card>

      {erro && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{erro}</div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/condicionais">Cancelar</Link>
        </Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar Saída
        </Button>
      </div>
    </div>
  );
}
