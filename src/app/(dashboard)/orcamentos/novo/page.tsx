"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Loader2,
  Package,
  User,
  X,
} from "lucide-react";
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
  fotoUrl: string | null;
  marca: string | null;
};

type ItemOrcamento = {
  varianteId: string;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  marca: string | null;
  precoUnit: number;
  desconto: number;
  quantidade: number;
  subtotal: number;
  qtdDisponivelMax: number;
};

const FORMAS_PAGAMENTO = [
  { value: "PIX", label: "PIX" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "DEBITO", label: "Débito" },
  { value: "CREDITO", label: "Crédito" },
  { value: "BOLETO", label: "Boleto" },
  { value: "DUPLICATA", label: "Duplicata" },
];

export default function NovoOrcamentoPage() {
  const router = useRouter();

  // Cliente
  const [clienteBusca, setClienteBusca] = useState("");
  const [clientesResult, setClientesResult] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);

  // Produtos
  const [prodBusca, setProdBusca] = useState("");
  const [prodResult, setProdResult] = useState<Variante[]>([]);
  const [buscando, setBuscando] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Itens
  const [itens, setItens] = useState<ItemOrcamento[]>([]);

  // Configurações do orçamento
  const [validadeDias, setValidadeDias] = useState(7);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [descontoGlobalStr, setDescontoGlobalStr] = useState("");
  const [tipoDesconto, setTipoDesconto] = useState<"valor" | "porcentagem">("valor");

  // Estado
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Busca de clientes
  useEffect(() => {
    if (clienteSel || !clienteBusca.trim()) {
      setClientesResult([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/clientes/search?q=${encodeURIComponent(clienteBusca)}`
        );
        if (res.ok) setClientesResult(await res.json());
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [clienteBusca, clienteSel]);

  // Busca de produtos
  useEffect(() => {
    if (!prodBusca.trim()) {
      setProdResult([]);
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const params = new URLSearchParams({ q: prodBusca, page: "1", limit: "20" });
        const res = await fetch(`/api/produtos/search?${params}`);
        if (res.ok) {
          const json = await res.json();
          setProdResult(Array.isArray(json) ? json : json.data ?? []);
        }
      } catch {}
      finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [prodBusca]);

  const addItem = useCallback((v: Variante) => {
    setProdBusca("");
    setProdResult([]);
    setItens((prev) => {
      const existe = prev.find((i) => i.varianteId === v.id);
      if (existe) {
        return prev.map((i) =>
          i.varianteId === v.id
            ? {
                ...i,
                quantidade: Math.min(i.quantidade + 1, v.qtdDisponivel),
                subtotal: (i.precoUnit - i.desconto) * Math.min(i.quantidade + 1, v.qtdDisponivel),
              }
            : i
        );
      }
      return [
        ...prev,
        {
          varianteId: v.id,
          nome: v.nome,
          cor: v.cor,
          tamanho: v.tamanho,
          marca: v.marca,
          precoUnit: v.preco,
          desconto: 0,
          quantidade: 1,
          subtotal: v.preco,
          qtdDisponivelMax: v.qtdDisponivel,
        },
      ];
    });
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const removeItem = (varianteId: string) =>
    setItens((prev) => prev.filter((i) => i.varianteId !== varianteId));

  const updateQuantidade = (varianteId: string, delta: number) => {
    setItens((prev) =>
      prev
        .map((i) => {
          if (i.varianteId !== varianteId) return i;
          const novaQtd = i.quantidade + delta;
          if (novaQtd <= 0) return null;
          const qtd = Math.min(novaQtd, i.qtdDisponivelMax);
          return { ...i, quantidade: qtd, subtotal: (i.precoUnit - i.desconto) * qtd };
        })
        .filter(Boolean) as ItemOrcamento[]
    );
  };

  const updatePrecoUnit = (varianteId: string, preco: number) => {
    setItens((prev) =>
      prev.map((i) => {
        if (i.varianteId !== varianteId) return i;
        return { ...i, precoUnit: preco, subtotal: (preco - i.desconto) * i.quantidade };
      })
    );
  };

  const updateDescontoItem = (varianteId: string, desc: number) => {
    setItens((prev) =>
      prev.map((i) => {
        if (i.varianteId !== varianteId) return i;
        const desconto = Math.min(desc, i.precoUnit);
        return { ...i, desconto, subtotal: (i.precoUnit - desconto) * i.quantidade };
      })
    );
  };

  const subtotalItens = itens.reduce((s, i) => s + i.precoUnit * i.quantidade, 0);
  const descontoGlobal =
    tipoDesconto === "porcentagem"
      ? Math.min((Number(descontoGlobalStr) || 0) / 100, 1) * subtotalItens
      : Math.min(Number(descontoGlobalStr) || 0, subtotalItens);
  const subtotalComItensDesconto = itens.reduce((s, i) => s + i.subtotal, 0);
  const total = Math.max(0, subtotalComItensDesconto - descontoGlobal);

  const salvar = async () => {
    setErro("");
    if (itens.length === 0) return setErro("Adicione ao menos um produto");
    setSalvando(true);
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteSel?.id || undefined,
          validadeDias,
          formaPagamento: formaPagamento || undefined,
          observacoes: observacoes || undefined,
          desconto: descontoGlobal,
          itens: itens.map((i) => ({
            varianteId: i.varianteId,
            quantidade: i.quantidade,
            precoUnit: i.precoUnit,
            desconto: i.desconto,
            subtotal: i.subtotal,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/orcamentos/${data.id}`);
      } else {
        const err = await res.json();
        setErro(err.message || err.error || "Erro ao criar orçamento");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orcamentos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Novo Orçamento</h1>
          <p className="text-muted-foreground">Crie um orçamento sem movimentar estoque</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cliente (optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente (opcional)
            </CardTitle>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setClienteSel(null);
                    setClienteBusca("");
                  }}
                >
                  <X className="h-4 w-4" />
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
                {clientesResult.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                    {clientesResult.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClienteSel(c);
                          setClienteBusca("");
                        }}
                        className="w-full text-left p-3 hover:bg-accent text-sm"
                      >
                        <p className="font-medium">{c.nome}</p>
                        <p className="text-muted-foreground text-xs">
                          {c.telefone || c.cpf || "—"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="validade">Validade (dias)</Label>
              <Input
                id="validade"
                type="number"
                min={1}
                max={365}
                value={validadeDias}
                onChange={(e) => setValidadeDias(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forma">Forma de Pagamento (opcional)</Label>
              <select
                id="forma"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Não definida</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Produtos</CardTitle>
            <span className="text-xs text-muted-foreground hidden md:block">
              F8 para focar · Esc para limpar
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            {buscando ? (
              <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              ref={searchRef}
              className="pl-9"
              placeholder="Buscar por nome, código interno ou código de barras..."
              value={prodBusca}
              onChange={(e) => setProdBusca(e.target.value)}
            />
          </div>

          {/* Results dropdown */}
          {prodResult.length > 0 && (
            <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
              {prodResult.map((v) => (
                <button
                  key={v.id}
                  onClick={() => addItem(v)}
                  disabled={v.qtdDisponivel <= 0}
                  className="w-full text-left p-3 hover:bg-accent transition-colors disabled:opacity-40 flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {v.fotoUrl ? (
                      <img src={v.fotoUrl} alt={v.nome} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{v.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.marca && <span className="mr-1">{v.marca}</span>}
                      {[v.cor, v.tamanho].filter(Boolean).join(" · ") || "Sem variação"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatCurrency(v.preco)}</p>
                    <Badge
                      variant={
                        v.qtdDisponivel <= 0
                          ? "secondary"
                          : v.qtdDisponivel <= 2
                          ? "destructive"
                          : "default"
                      }
                      className="text-[10px]"
                    >
                      {v.qtdDisponivel <= 0 ? "Esgotado" : `Disp: ${v.qtdDisponivel}`}
                    </Badge>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {prodBusca.trim() && !buscando && prodResult.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produto encontrado para &quot;{prodBusca}&quot;
            </p>
          )}

          {/* Items table */}
          {itens.length > 0 && (
            <>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Produto</th>
                      <th className="px-3 py-2 text-center font-medium">Qtd</th>
                      <th className="px-3 py-2 text-right font-medium">Preço Unit.</th>
                      <th className="px-3 py-2 text-right font-medium">Desc. Item</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itens.map((item) => (
                      <tr key={item.varianteId}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {[item.marca, item.cor, item.tamanho].filter(Boolean).join(" / ") || "—"}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantidade(item.varianteId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantidade}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantidade(item.varianteId, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.precoUnit}
                            onChange={(e) =>
                              updatePrecoUnit(item.varianteId, Number(e.target.value))
                            }
                            className="w-28 text-right h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.desconto}
                            onChange={(e) =>
                              updateDescontoItem(item.varianteId, Number(e.target.value))
                            }
                            className="w-24 text-right h-8"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(item.varianteId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Global discount and total */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-3 justify-end">
                  <Label className="shrink-0">Desconto global:</Label>
                  <div className="flex items-center gap-2">
                    <select
                      value={tipoDesconto}
                      onChange={(e) =>
                        setTipoDesconto(e.target.value as "valor" | "porcentagem")
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="valor">R$</option>
                      <option value="porcentagem">%</option>
                    </select>
                    <Input
                      type="number"
                      min={0}
                      step={tipoDesconto === "porcentagem" ? 1 : 0.01}
                      max={tipoDesconto === "porcentagem" ? 100 : undefined}
                      value={descontoGlobalStr}
                      onChange={(e) => setDescontoGlobalStr(e.target.value)}
                      placeholder="0"
                      className="w-28 h-9"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 text-sm">
                  <div className="flex justify-between w-48">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(subtotalComItensDesconto)}</span>
                  </div>
                  {descontoGlobal > 0 && (
                    <div className="flex justify-between w-48 text-destructive">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(descontoGlobal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-48 text-lg font-bold border-t pt-1 mt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {itens.length === 0 && !prodBusca && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Package className="h-12 w-12 mb-3" />
              <p>Busque e adicione produtos acima</p>
            </div>
          )}
        </CardContent>
      </Card>

      {erro && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {erro}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/orcamentos">Cancelar</Link>
        </Button>
        <Button onClick={salvar} disabled={salvando || itens.length === 0}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Orçamento
        </Button>
      </div>
    </div>
  );
}
