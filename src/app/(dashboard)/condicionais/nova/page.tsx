"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Search, Trash2, Plus, ArrowLeft, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { CupomCondicional } from "@/components/condicional/cupom";

type Cliente = { id: string; nome: string; telefone: string | null; cpf: string | null };
type Categoria = { id: string; nome: string };
type Variante = {
  id: string;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  codigoBarras: string;
  preco: number;
  qtdDisponivel: number;
  fotoUrl: string | null;
};
type ItemCarrinho = Variante & { quantidade: number };

type DadosCupom = {
  numero: number;
  clienteNome: string | null;
  clienteTelefone: string | null;
  dataSaida: string;
  dataVencimento: string;
  prazoDias: number;
  observacoes?: string | null;
  itens: {
    nome: string;
    cor: string | null;
    tamanho: string | null;
    quantidade: number;
    preco: number;
    subtotal: number;
  }[];
};

export default function NovaCondicionalPage() {
  const [clienteBusca, setClienteBusca] = useState("");
  const [clientesResult, setClientesResult] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [prodBusca, setProdBusca] = useState("");
  const [prodResult, setProdResult] = useState<Variante[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const [prazoDias, setPrazoDias] = useState(5);
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Cupom apos salvar
  const [cupom, setCupom] = useState<DadosCupom | null>(null);
  const [condicionalId, setCondicionalId] = useState<string | null>(null);

  // Carregar categorias
  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const lista = Array.isArray(d) ? d : (d.data ?? []);
        setCategorias(lista);
      })
      .catch(() => {});
  }, []);

  // Busca de clientes com debounce
  useEffect(() => {
    if (clienteSel || !clienteBusca.trim()) { setClientesResult([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientes/search?q=${encodeURIComponent(clienteBusca)}`);
        if (res.ok) setClientesResult(await res.json());
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [clienteBusca, clienteSel]);

  // Busca de produtos com debounce (texto + categoria)
  useEffect(() => {
    if (!prodBusca.trim() && !categoriaFiltro) { setProdResult([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const params = new URLSearchParams({ page: "1", limit: "20" });
        if (prodBusca.trim()) params.set("q", prodBusca);
        if (categoriaFiltro) params.set("categoriaId", categoriaFiltro);
        const res = await fetch(`/api/produtos/search?${params}`);
        if (res.ok) {
          const json = await res.json();
          setProdResult(Array.isArray(json) ? json : (json.data ?? []));
        }
      } catch {}
      finally { setBuscando(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [prodBusca, categoriaFiltro]);

  // F8 foca na busca, Escape limpa
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F8") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        e.preventDefault(); setProdBusca("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const addItem = useCallback((v: Variante) => {
    setProdBusca("");
    setProdResult([]);
    setItens((prev) => {
      const existe = prev.find((i) => i.id === v.id);
      if (existe) return prev.map((i) => i.id === v.id ? { ...i, quantidade: Math.min(i.quantidade + 1, v.qtdDisponivel) } : i);
      return [...prev, { ...v, quantidade: 1 }];
    });
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const removeItem = (id: string) => setItens((prev) => prev.filter((i) => i.id !== id));
  const setQtd = (id: string, qtd: number) =>
    setItens((prev) => prev.map((i) => i.id === id ? { ...i, quantidade: Math.max(1, Math.min(qtd, i.qtdDisponivel)) } : i));

  const total = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);

  const salvar = async () => {
    setErro("");
    if (!clienteSel) return setErro("Selecione um cliente");
    if (itens.length === 0) return setErro("Adicione ao menos um produto");
    setSalvando(true);
    try {
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
      if (res.ok) {
        const data = await res.json();
        // Calcular data de vencimento
        const dataSaida = new Date();
        const dataVencimento = new Date(dataSaida);
        dataVencimento.setDate(dataVencimento.getDate() + prazoDias);

        // Montar dados do cupom
        setCupom({
          numero: data.numero,
          clienteNome: clienteSel.nome,
          clienteTelefone: clienteSel.telefone,
          dataSaida: dataSaida.toISOString(),
          dataVencimento: dataVencimento.toISOString(),
          prazoDias,
          observacoes,
          itens: itens.map((i) => ({
            nome: i.nome,
            cor: i.cor,
            tamanho: i.tamanho,
            quantidade: i.quantidade,
            preco: i.preco,
            subtotal: i.preco * i.quantidade,
          })),
        });
        setCondicionalId(data.id);
      } else {
        const err = await res.json();
        setErro(err.message || "Erro ao criar condicional");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  // Mostrar cupom apos salvar
  if (cupom && condicionalId) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-green-600">✓ Condicional registrada!</h1>
          <p className="text-muted-foreground">
            Condicional #{cupom.numero} criada para {cupom.clienteNome}
          </p>
        </div>
        <CupomCondicional
          condicional={cupom}
          onFechar={() => { window.location.href = `/condicionais/${condicionalId}`; }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/condicionais"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Condicional</h1>
          <p className="text-muted-foreground">Registre os produtos que o cliente vai levar</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cliente */}
        <Card>
          <CardHeader><CardTitle className="text-lg">1. Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {clienteSel ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{clienteSel.nome}</p>
                  <p className="text-sm text-muted-foreground">{clienteSel.telefone || clienteSel.cpf || "—"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setClienteSel(null); setClienteBusca(""); }}>
                  Trocar
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar por nome, CPF ou telefone" value={clienteBusca}
                    onChange={(e) => setClienteBusca(e.target.value)} autoFocus />
                </div>
                {clientesResult.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                    {clientesResult.map((c) => (
                      <button key={c.id} onClick={() => { setClienteSel(c); setClienteBusca(""); }}
                        className="w-full text-left p-3 hover:bg-accent text-sm">
                        <p className="font-medium">{c.nome}</p>
                        <p className="text-muted-foreground text-xs">{c.telefone || c.cpf || "—"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Prazo */}
        <Card>
          <CardHeader><CardTitle className="text-lg">2. Prazo e observações</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo de devolução (dias)</Label>
              <Input id="prazo" type="number" min={1} max={30} value={prazoDias}
                onChange={(e) => setPrazoDias(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Input id="obs" placeholder="Opcional" value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">3. Produtos</CardTitle>
            <span className="text-xs text-muted-foreground hidden md:block">F8 para focar · Esc para limpar</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtro por categoria */}
          {categorias.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoriaFiltro("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !categoriaFiltro ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                Todas
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaFiltro(categoriaFiltro === cat.id ? "" : cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    categoriaFiltro === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          )}

          {/* Campo de busca */}
          <div className="relative">
            {buscando ? (
              <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input ref={searchRef} className="pl-9"
              placeholder="Buscar por nome, código interno ou código de barras..."
              value={prodBusca} onChange={(e) => setProdBusca(e.target.value)} />
          </div>

          {/* Resultados */}
          {prodResult.length > 0 && (
            <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
              {prodResult.map((v) => (
                <button key={v.id} onClick={() => addItem(v)} disabled={v.qtdDisponivel <= 0}
                  className="w-full text-left p-3 hover:bg-accent transition-colors disabled:opacity-40 flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {v.fotoUrl ? <img src={v.fotoUrl} alt={v.nome} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{v.nome}</p>
                    <p className="text-xs text-muted-foreground">{[v.cor, v.tamanho].filter(Boolean).join(" · ") || "Sem variação"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatCurrency(v.preco)}</p>
                    <Badge variant={v.qtdDisponivel <= 0 ? "secondary" : v.qtdDisponivel <= 2 ? "destructive" : "default"} className="text-[10px]">
                      {v.qtdDisponivel <= 0 ? "Esgotado" : `Disp: ${v.qtdDisponivel}`}
                    </Badge>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {(prodBusca.trim() || categoriaFiltro) && !buscando && prodResult.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produto encontrado{prodBusca ? ` para "${prodBusca}"` : ""}
              {categoriaFiltro ? ` nesta categoria` : ""}
            </p>
          )}

          {/* Itens selecionados */}
          {itens.length > 0 && (
            <div className="rounded-md border divide-y">
              {itens.map((i) => (
                <div key={i.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{i.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[i.cor, i.tamanho].filter(Boolean).join(" · ") || "—"} · {formatCurrency(i.preco)}
                    </p>
                  </div>
                  <Input type="number" min={1} max={i.qtdDisponivel} value={i.quantidade}
                    onChange={(e) => setQtd(i.id, Number(e.target.value))} className="w-20 text-center" />
                  <span className="w-24 text-right font-medium text-sm">{formatCurrency(i.preco * i.quantidade)}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
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

      {erro && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{erro}</div>}

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild><Link href="/condicionais">Cancelar</Link></Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar Saída
        </Button>
      </div>
    </div>
  );
}