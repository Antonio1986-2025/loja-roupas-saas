"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { FotoModal } from "@/components/foto-modal";
import { ModalNovoCliente } from "@/components/modal-novo-cliente";
import { CupomVenda } from "@/components/cupom-venda";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  User,
  CheckCircle2,
  Loader2,
  X,
  ImageIcon,
  ChevronDown,
} from "lucide-react";

type Cliente = { id: string; nome: string; telefone: string | null; cpf: string | null; creditoAtual?: number };
type Variante = {
  id: string;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  codigoBarras: string;
  preco: number;
  qtdDisponivel: number;
  marca: string | null;
  codigoInterno: string | null;
  genero: string | null;
  fotoUrl: string | null;
};
type ItemCarrinho = {
  id: string;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  codigoBarras: string;
  preco: number;
  quantidade: number;
  fotoUrl: string | null;
  marca: string | null;
  qtdDisponivelMax: number;
};

const FORMAS_PAGAMENTO = [
  { value: "DINHEIRO", label: "Dinheiro", icon: "💵" },
  { value: "PIX", label: "PIX", icon: "⚡" },
  { value: "DEBITO", label: "Débito", icon: "💳" },
  { value: "CREDITO", label: "Crédito", icon: "💳" },
  { value: "BOLETO", label: "Boleto", icon: "📄" },
] as const;

export default function PdvPage() {
  const router = useRouter();

  const [prodBusca, setProdBusca] = useState("");
  const [prodResult, setProdResult] = useState<Variante[]>([]);
  const [prodPage, setProdPage] = useState(1);
  const [prodTotalPages, setProdTotalPages] = useState(1);
  const [prodLoading, setProdLoading] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [painelAtivo, setPainelAtivo] = useState<"produtos" | "carrinho">("produtos");

  const [clienteBusca, setClienteBusca] = useState("");
  const [clientesResult, setClientesResult] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);

  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [pagamentoMisto, setPagamentoMisto] = useState(false);
  const [splitPagamentos, setSplitPagamentos] = useState<{ formaPagamento: string; valor: number }[]>([]);
  const [descontoStr, setDescontoStr] = useState("");
  const [tipoDesconto, setTipoDesconto] = useState<"valor" | "porcentagem">("valor");
  const [usarCredito, setUsarCredito] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [caixaAtual, setCaixaAtual] = useState<{ id: string; saldoAtual: number } | null>(null);
  const [caixaLoading, setCaixaLoading] = useState(true);
  const [mostrarAbrirCaixa, setMostrarAbrirCaixa] = useState(false);
  const [saldoInicialInput, setSaldoInicialInput] = useState("");
  const [abrindoCaixa, setAbrindoCaixa] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmandoVenda, setConfirmandoVenda] = useState(false);
  const [vendaCupom, setVendaCupom] = useState<{
    numero: number;
    total: number;
    subtotal: number;
    desconto: number;
    formaPagamento: string;
    clienteNome: string | null;
    itens: { nome: string; variante: string; quantidade: number; preco: number; subtotal: number }[];
    createdAt: string;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      setProdLoading(true);
      setProdPage(1);
      try {
        const params = new URLSearchParams({ q: prodBusca, page: "1", limit: "20" });
        if (categoriaFiltro) params.set("categoriaId", categoriaFiltro);
        const res = await fetch(`/api/produtos/search?${params}`);
        if (res.ok) {
          const json = await res.json();
          setProdResult(json.data);
          setProdTotalPages(json.totalPages);
        }
      } finally {
        setProdLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [prodBusca, categoriaFiltro]);

  const carregarMais = useCallback(async () => {
    const nextPage = prodPage + 1;
    if (nextPage > prodTotalPages) return;
    setProdLoading(true);
    try {
      const params = new URLSearchParams({ q: prodBusca, page: String(nextPage), limit: "20" });
      if (categoriaFiltro) params.set("categoriaId", categoriaFiltro);
      const res = await fetch(`/api/produtos/search?${params}`);
      if (res.ok) {
        const json = await res.json();
        setProdResult((prev) => [...prev, ...json.data]);
        setProdPage(nextPage);
      }
    } finally {
      setProdLoading(false);
    }
  }, [prodPage, prodTotalPages, prodBusca, categoriaFiltro]);

  useEffect(() => {
    fetch("/api/categorias").then(async (res) => {
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) setCategorias(json);
        else if (json.data) setCategorias(json.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/caixa/atual").then(async (res) => {
      if (res.ok) {
        const json = await res.json();
        if (json && json.id) {
          setCaixaAtual({ id: json.id, saldoAtual: json.saldoAtual });
          setMostrarAbrirCaixa(false);
        } else {
          setCaixaAtual(null);
          setMostrarAbrirCaixa(true);
        }
      } else {
        setCaixaAtual(null);
        setMostrarAbrirCaixa(true);
      }
    }).catch(() => {
      setCaixaAtual(null);
      setMostrarAbrirCaixa(true);
    }).finally(() => setCaixaLoading(false));
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") { e.preventDefault(); setFormaPagamento("PIX"); }
      if (e.key === "F2") { e.preventDefault(); setFormaPagamento("DINHEIRO"); }
      if (e.key === "F3") { e.preventDefault(); setFormaPagamento("DEBITO"); }
      if (e.key === "F4") { e.preventDefault(); setFormaPagamento("CREDITO"); }
      if (e.key === "F5") { e.preventDefault(); setFormaPagamento("BOLETO"); }
      if (e.key === "F8") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F12") { e.preventDefault(); abrirConfirmacao(); }
      if (e.key === "Escape") { e.preventDefault(); setProdBusca(""); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  useEffect(() => {
    if (clienteSel) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clientes/search?q=${encodeURIComponent(clienteBusca)}`);
      if (res.ok) setClientesResult(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [clienteBusca, clienteSel]);

  const addItem = useCallback((v: Variante) => {
    setItens((prev) => {
      const existe = prev.find((i) => i.id === v.id);
      if (existe) {
        return prev.map((i) =>
          i.id === v.id
            ? { ...i, quantidade: Math.min(i.quantidade + 1, v.qtdDisponivel) }
            : i
        );
      }
      return [...prev, { ...v, quantidade: 1, fotoUrl: v.fotoUrl, marca: v.marca, qtdDisponivelMax: v.qtdDisponivel }];
    });
  }, []);

  const buscarBarras = useCallback(async (codigo: string) => {
    const res = await fetch(`/api/produtos/search?q=${encodeURIComponent(codigo)}&limit=100`);
    if (!res.ok) return;
    const json = await res.json();
    const lista: Variante[] = json.data || json;
    const match = lista.find((v) => v.codigoBarras === codigo);
    if (match) {
      addItem(match);
      setProdBusca("");
    } else if (lista.length === 1) {
      addItem(lista[0]);
      setProdBusca("");
    }
  }, [addItem]);

  const removeItem = (id: string) => setItens((prev) => prev.filter((i) => i.id !== id));

  const updateQtd = (id: string, delta: number) => {
    setItens((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const novaQtd = i.quantidade + delta;
        if (novaQtd <= 0) return null;
        const maxQtd = i.qtdDisponivelMax ?? 999;
        return { ...i, quantidade: Math.min(novaQtd, maxQtd) };
      }).filter(Boolean) as ItemCarrinho[]
    );
  };

  const subtotal = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const descontoValor = tipoDesconto === "porcentagem"
    ? Math.min((Number(descontoStr) || 0) / 100, 1) * subtotal
    : Math.min(Number(descontoStr) || 0, subtotal);
  const total = Math.max(0, subtotal - descontoValor);
  const creditoUsar = usarCredito && clienteSel?.creditoAtual ? Math.min(Number(clienteSel.creditoAtual), total) : 0;
  const totalEfetivo = total - creditoUsar;

  const abrirConfirmacao = () => {
    setErro("");
    if (!caixaAtual) {
      setErro("Abra o caixa antes de finalizar a venda");
      return;
    }
    if (itens.length === 0) {
      setErro("Adicione ao menos um produto");
      return;
    }
    setConfirmandoVenda(true);
  };

  const confirmarVenda = async () => {
    setErro("");
    setConfirmandoVenda(false);
    setFinalizando(true);

    try {
      let pagamentosEnvio = pagamentoMisto && splitPagamentos.length > 0
        ? [...splitPagamentos]
        : [{ formaPagamento, valor: total }];

      if (creditoUsar > 0) {
        const resto = totalEfetivo;
        pagamentosEnvio = pagamentosEnvio
          .filter((p) => p.formaPagamento !== "CREDITO_LOJA")
          .map((p, i, arr) => {
            if (i === arr.length - 1) return { ...p, valor: resto - arr.slice(0, i).reduce((s, x) => s + x.valor, 0) };
            return p;
          });
        pagamentosEnvio.push({ formaPagamento: "CREDITO_LOJA", valor: creditoUsar });
      }

      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteSel?.id || undefined,
          caixaId: caixaAtual?.id || undefined,
          formaPagamento,
          pagamentos: pagamentosEnvio,
          desconto: descontoValor,
          observacoes: observacoes || undefined,
          itens: itens.map((i) => ({
            varianteId: i.id,
            quantidade: i.quantidade,
            precoUnit: i.preco,
            subtotal: i.preco * i.quantidade,
          })),
        }),
      });

      if (res.ok) {
        const venda = await res.json();
        const creditLabel = creditoUsar > 0 ? ` + Crédito ${formatCurrency(creditoUsar)}` : "";
        setVendaCupom({
          numero: venda.numero,
          total: Number(venda.total),
          subtotal,
          desconto: descontoValor,
          formaPagamento: (pagamentoMisto ? "Misto" : formaPagamento) + creditLabel,
          clienteNome: clienteSel?.nome || null,
          itens: itens.map((i) => ({
            nome: i.nome,
            variante: [i.marca, i.cor, i.tamanho].filter(Boolean).join(" / "),
            quantidade: i.quantidade,
            preco: i.preco,
            subtotal: i.preco * i.quantidade,
          })),
          createdAt: new Date().toISOString(),
        });
        setItens([]);
        setClienteSel(null);
        setProdBusca("");
        setDescontoStr("");
        setTipoDesconto("valor");
        setObservacoes("");
        setPagamentoMisto(false);
        setSplitPagamentos([]);
        setUsarCredito(false);
      } else {
        const err = await res.json();
        const msg = err.message 
          || err.issues?.[0]?.message 
          || `Erro ${err.error || "desconhecido"}`
          || "Erro ao finalizar venda";
        setErro(msg);
      }
    } catch {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setFinalizando(false);
    }
  };

  if (mostrarAbrirCaixa && !caixaLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-lg mx-4">
          <h2 className="text-xl font-semibold mb-2">Abrir Caixa</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Para iniciar as vendas, informe o valor do fundo de troco.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Fundo de Troco (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={saldoInicialInput}
                onChange={(e) => setSaldoInicialInput(e.target.value)}
                placeholder="0,00"
                className="mt-1"
                autoFocus
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button
              className="w-full"
              disabled={abrindoCaixa || !saldoInicialInput}
              onClick={async () => {
                setErro("");
                const valor = Number(saldoInicialInput);
                if (isNaN(valor) || valor < 0) { setErro("Valor inválido"); return; }
                setAbrindoCaixa(true);
                try {
                  const res = await fetch("/api/caixa", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ saldoInicial: valor }),
                  });
                  if (res.ok) {
                    const json = await res.json();
                    setCaixaAtual({ id: json.id, saldoAtual: json.saldoInicial });
                    setMostrarAbrirCaixa(false);
                    setSaldoInicialInput("");
                  } else {
                    const err = await res.json();
                    setErro(err.message || "Erro ao abrir caixa");
                  }
                } catch {
                  setErro("Erro ao conectar");
                } finally {
                  setAbrindoCaixa(false);
                }
              }}
            >
              {abrindoCaixa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Abrir Caixa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (vendaCupom) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-lg">
          <CupomVenda
            venda={vendaCupom}
            onNovaVenda={() => setVendaCupom(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] -m-6">
      {isMobile && (
        <div className="flex md:hidden border-b bg-white shrink-0">
          <button
            onClick={() => setPainelAtivo("produtos")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              painelAtivo === "produtos"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground border-b-2 border-transparent"
            }`}
          >
            <Search className="h-4 w-4" />
            Produtos
          </button>
          <button
            onClick={() => setPainelAtivo("carrinho")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              painelAtivo === "carrinho"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground border-b-2 border-transparent"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Carrinho
            {itens.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {itens.length}
              </span>
            )}
          </button>
        </div>
      )}
      <div className={`flex-1 flex flex-col border-b md:border-b-0 md:border-r overflow-hidden ${
        isMobile && painelAtivo === "carrinho" ? "hidden" : ""
      }`}>
        <div className="p-4 border-b bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="pl-10 pr-10 h-11 text-lg"
              placeholder="Buscar por nome, código..."
              value={prodBusca}
              onChange={(e) => setProdBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && prodBusca.trim()) {
                  buscarBarras(prodBusca.trim());
                }
              }}
              autoFocus
            />
            {prodBusca && (
              <button
                onClick={() => { setProdBusca(""); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {categorias.length > 0 && (
            <div className={`flex gap-1.5 mb-3 pb-3 border-b ${isMobile ? "flex-nowrap overflow-x-auto overflow-y-hidden" : "flex-wrap"}`}>
              <button
                onClick={() => setCategoriaFiltro("")}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  !categoriaFiltro
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                Todas
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaFiltro(cat.id)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    categoriaFiltro === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          )}

          {prodResult.length === 0 && !prodLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-16 w-16 mb-4" />
              <p className="text-lg">Digite o nome ou código do produto</p>
              <p className="text-sm">ou escaneie o código de barras</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {prodResult.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-lg border p-3 transition-all bg-white ${
                      v.qtdDisponivel <= 0 ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {v.fotoUrl ? (
                        <FotoModal src={v.fotoUrl} alt={v.nome}>
                          <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                            <img
                              src={v.fotoUrl}
                              alt={v.nome}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </FotoModal>
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{v.nome}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.marca && (
                            <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {v.marca}
                            </span>
                          )}
                          {v.codigoInterno && (
                            <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {v.codigoInterno}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {[v.cor, v.tamanho, v.genero].filter(Boolean).join(" / ") || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-base font-bold text-primary">
                        {formatCurrency(v.preco)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={v.qtdDisponivel > 0 ? "secondary" : "destructive"} className="text-[10px]">
                          {v.qtdDisponivel > 0 ? `${v.qtdDisponivel} disp` : "sem estoque"}
                        </Badge>
                        <button
                          onClick={() => addItem(v)}
                          disabled={v.qtdDisponivel <= 0}
                          className="inline-flex items-center gap-1 text-xs font-medium rounded-md bg-primary text-primary-foreground px-2.5 py-1 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {prodPage < prodTotalPages && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carregarMais}
                    disabled={prodLoading}
                    className="gap-1"
                  >
                    {prodLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    Carregar mais ({prodResult.length} de {prodTotalPages * 20}+)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`w-full md:w-96 lg:w-[420px] flex flex-col bg-white ${
        isMobile && painelAtivo === "produtos" ? "hidden" : ""
      }`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho
            {itens.length > 0 && (
              <Badge className="ml-auto">{itens.length} item(ns)</Badge>
            )}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <ShoppingCart className="h-12 w-12 mb-3" />
              Carrinho vazio
            </div>
          ) : (
            itens.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg border p-2">
                {item.fotoUrl ? (
                  <FotoModal src={item.fotoUrl} alt={item.nome}>
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 cursor-pointer">
                      <img
                        src={item.fotoUrl}
                        alt={item.nome}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </FotoModal>
                ) : (
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.nome}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {[item.marca, item.cor, item.tamanho].filter(Boolean).join(" / ") || "—"}
                  </p>
                  <p className="text-sm font-semibold text-primary mt-0.5">
                    {formatCurrency(item.preco)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQtd(item.id, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium text-sm">
                    {item.quantidade}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQtd(item.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="font-semibold text-sm">
                    {formatCurrency(item.preco * item.quantidade)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive shrink-0"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="border-t p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Cliente</span>
            </div>
            <div className="flex gap-2">
              {clienteSel ? (
                <div className="flex-1 flex items-center justify-between rounded-md border p-2">
                  <div className="text-sm min-w-0">
                    <span className="font-medium">{clienteSel.nome}</span>
                    <span className="text-muted-foreground ml-2">
                      {clienteSel.telefone || clienteSel.cpf || ""}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setClienteSel(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 relative">
                  <Input
                    placeholder="Buscar cliente (opcional)"
                    value={clienteBusca}
                    onChange={(e) => setClienteBusca(e.target.value)}
                    className="h-9 text-sm pr-8"
                  />
                  {clienteBusca && (
                    <button
                      onClick={() => setClienteBusca("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
              <ModalNovoCliente
                onClienteCriado={(c) => {
                  setClienteSel({ ...c, cpf: null });
                  setClienteBusca("");
                }}
              />
            </div>
            {clienteBusca && !clienteSel && clientesResult.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md border divide-y text-sm">
                {clientesResult.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClienteSel(c);
                      setClienteBusca("");
                    }}
                    className="w-full text-left p-2 hover:bg-accent"
                  >
                    <span className="font-medium">{c.nome}</span>
                    <span className="text-muted-foreground ml-2">
                      {c.telefone || c.cpf || ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {clienteSel && Number(clienteSel.creditoAtual) > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-2.5">
              <input
                type="checkbox"
                id="usarCredito"
                checked={usarCredito}
                onChange={(e) => {
                  setUsarCredito(e.target.checked);
                  if (!e.target.checked) {
                    setSplitPagamentos((prev) => prev.filter((p) => p.formaPagamento !== "CREDITO_LOJA"));
                  }
                }}
                className="h-4 w-4 rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
              />
              <label htmlFor="usarCredito" className="text-sm flex-1 cursor-pointer">
                <span className="font-medium">Usar crédito disponível</span>
                <span className="text-yellow-700 font-semibold ml-1">
                  {formatCurrency(Number(clienteSel.creditoAtual))}
                </span>
              </label>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Forma de Pagamento</p>
              <button
                onClick={() => {
                  setPagamentoMisto(!pagamentoMisto);
                  if (!pagamentoMisto) {
                    setSplitPagamentos([]);
                  }
                }}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  pagamentoMisto
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {pagamentoMisto ? "Misto" : "Simples"}
              </button>
            </div>

            {pagamentoMisto ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Rateio: {formatCurrency(splitPagamentos.reduce((s, p) => s + p.valor, 0))} / {formatCurrency(totalEfetivo)}
                  {creditoUsar > 0 && <span className="text-yellow-600 ml-1">(+{formatCurrency(creditoUsar)} crédito)</span>}
                </p>
                {splitPagamentos.map((sp, idx) => (
                  <div key={idx} className="flex gap-1 items-center">
                    <select
                      value={sp.formaPagamento}
                      onChange={(e) => {
                        const next = [...splitPagamentos];
                        next[idx] = { ...next[idx], formaPagamento: e.target.value };
                        setSplitPagamentos(next);
                      }}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {FORMAS_PAGAMENTO.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={0.01}
                      max={totalEfetivo}
                      step={0.01}
                      value={sp.valor || ""}
                      onChange={(e) => {
                        const next = [...splitPagamentos];
                        next[idx] = { ...next[idx], valor: Number(e.target.value) || 0 };
                        setSplitPagamentos(next);
                      }}
                      className="h-9 w-24 text-xs text-right"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => setSplitPagamentos((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={() => {
                    const resto = totalEfetivo - splitPagamentos.reduce((s, p) => s + p.valor, 0);
                    setSplitPagamentos((prev) => [
                      ...prev,
                      { formaPagamento: "PIX", valor: Math.max(0.01, resto || totalEfetivo) },
                    ]);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar pagamento
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1">
                {FORMAS_PAGAMENTO.map((f) => (
                  <Button
                    key={f.value}
                    variant={formaPagamento === f.value ? "default" : "outline"}
                    size="sm"
                    className="h-12 text-xs flex-col gap-0.5"
                    onClick={() => setFormaPagamento(f.value)}
                  >
                    <span className="text-base">{f.icon}</span>
                    <span>{f.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Observações</p>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações da venda (opcional)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              rows={2}
            />
          </div>

          {caixaAtual && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-green-800">Caixa Aberto</span>
              <span className="text-green-600 font-medium ml-auto">{formatCurrency(caixaAtual.saldoAtual)}</span>
            </div>
          )}

          {subtotal > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Desconto</span>
                <div className="ml-auto flex rounded-md border border-input overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setTipoDesconto("valor"); setDescontoStr(""); }}
                    className={`px-2 py-0.5 text-xs transition-colors ${
                      tipoDesconto === "valor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTipoDesconto("porcentagem"); setDescontoStr(""); }}
                    className={`px-2 py-0.5 text-xs transition-colors ${
                      tipoDesconto === "porcentagem"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    %
                  </button>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={tipoDesconto === "porcentagem" ? 100 : subtotal}
                  step={tipoDesconto === "porcentagem" ? 1 : 0.01}
                  value={descontoStr}
                  onChange={(e) => setDescontoStr(e.target.value)}
                  placeholder={tipoDesconto === "porcentagem" ? "0" : "0,00"}
                  className="h-8 text-sm w-20 text-right"
                />
              </div>
              {descontoStr && Number(descontoStr) > 0 && (
                <p className="text-[11px] text-muted-foreground text-right">
                  {tipoDesconto === "porcentagem"
                    ? `≈ ${formatCurrency(descontoValor)}`
                    : `${((descontoValor / subtotal) * 100).toFixed(1)}%`}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm text-muted-foreground">
                {descontoValor > 0 && (
                  <span className="line-through text-muted-foreground/60 mr-2">
                    {formatCurrency(subtotal)}
                  </span>
                )}
                Total
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalEfetivo)}
                {creditoUsar > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (crédito: -{formatCurrency(creditoUsar)})
                  </span>
                )}
              </p>
            </div>
            <Button
              size="lg"
              className="h-14 px-8 text-lg"
              disabled={itens.length === 0 || finalizando}
              onClick={abrirConfirmacao}
            >
              {finalizando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Finalizar Venda"
              )}
            </Button>
          </div>

          {erro && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {erro}
            </div>
          )}
        </div>
      </div>

      {isMobile && painelAtivo === "produtos" && itens.length > 0 && (
        <button
          onClick={() => setPainelAtivo("carrinho")}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg md:hidden"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="font-semibold text-sm">{formatCurrency(total)}</span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-foreground/20 text-primary-foreground text-[10px] font-bold">
            {itens.length}
          </span>
        </button>
      )}

      {confirmandoVenda && (
        <div className={`fixed inset-0 z-50 flex ${isMobile ? "items-end" : "items-center"} justify-center`}>
          <div className="fixed inset-0 bg-black/60" onClick={() => setConfirmandoVenda(false)} />
          <div className={`relative z-50 w-full border bg-white p-6 shadow-lg max-h-[85vh] overflow-y-auto ${
            isMobile
              ? "max-w-full rounded-t-xl mx-0"
              : "max-w-lg rounded-lg mx-4"
          }`}>
            <button
              onClick={() => setConfirmandoVenda(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-lg font-semibold mb-1">Confirmar Venda</h2>
            <p className="text-sm text-muted-foreground mb-4">Revise os dados antes de finalizar</p>

            <div className="space-y-3">
              {clienteSel && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-md p-2.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{clienteSel.nome}</span>
                  <span className="text-muted-foreground">{clienteSel.telefone || clienteSel.cpf || ""}</span>
                </div>
              )}

              <div className="space-y-1.5">
                {itens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {[item.marca, item.cor, item.tamanho].filter(Boolean).join(" / ") || "—"}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="font-medium">{formatCurrency(item.preco * item.quantidade)}</p>
                      <p className="text-xs text-muted-foreground">{item.quantidade}x {formatCurrency(item.preco)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="border-t" />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {descontoValor > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="text-destructive">-{formatCurrency(descontoValor)}</span>
                  </div>
                )}
                {creditoUsar > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Crédito Loja</span>
                    <span>-{formatCurrency(creditoUsar)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total a Pagar</span>
                  <span>{formatCurrency(totalEfetivo)}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                <span className="font-medium">Pagamento: </span>
                {creditoUsar > 0 && (
                  <span>Crédito Loja {formatCurrency(creditoUsar)} + </span>
                )}
                {pagamentoMisto
                  ? splitPagamentos.map((sp, i) => (
                      <span key={i}>
                        {i > 0 && " + "}
                        {sp.formaPagamento} {formatCurrency(sp.valor)}
                      </span>
                    ))
                  : `${FORMAS_PAGAMENTO.find((f) => f.value === formaPagamento)?.label || formaPagamento} ${formatCurrency(totalEfetivo)}`}
              </div>

              {observacoes && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                  <span className="font-medium">Obs: </span>
                  {observacoes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
              <Button variant="outline" onClick={() => setConfirmandoVenda(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarVenda} disabled={finalizando}>
                {finalizando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar Venda
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
