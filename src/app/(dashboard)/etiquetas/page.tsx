"use client";

import "@/components/etiquetas/etiqueta-print.css";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Loader2, ArrowLeft, Plus, Minus, X, Settings2, Search } from "lucide-react";
import { Etiqueta, type EtiquetaItem } from "@/components/etiquetas/etiqueta";
import Link from "next/link";

type ItemComQtd = EtiquetaItem & { qtdEtiquetas: number };

export default function EtiquetasPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <EtiquetasContent />
    </Suspense>
  );
}

function EtiquetasContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [itens, setItens] = useState<ItemComQtd[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [inicioEtiqueta, setInicioEtiqueta] = useState(1);
  const [mostrarConfig, setMostrarConfig] = useState(false);

  // Busca manual
  const [busca, setBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<EtiquetaItem[]>([]);
  const [buscando, setBuscando] = useState(false);
  const buscaTimer = useRef<NodeJS.Timeout | null>(null);

  const nomeLoja = session?.user?.tenantName?.toUpperCase() ?? "STORI";

  const listaImprimir = itens.flatMap((item) => Array(item.qtdEtiquetas).fill(item));
  const vazias = Math.max(0, inicioEtiqueta - 1);
  const totalCelulas = vazias + listaImprimir.length;
  const totalFolhas = Math.ceil(totalCelulas / 33) || 0;

  // Carrega via query string (vindo de Produtos / Categorias / Entradas)
  const carregarVariantes = useCallback(async () => {
    const varianteIds = searchParams.get("varianteIds");
    const categoriaId = searchParams.get("categoriaId");
    const entradaId   = searchParams.get("entradaId");
    const produtoId   = searchParams.get("produtoId");
    if (!varianteIds && !categoriaId && !entradaId && !produtoId) return;
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (varianteIds) params.set("varianteIds", varianteIds);
      if (categoriaId) params.set("categoriaId", categoriaId);
      if (entradaId)   params.set("entradaId", entradaId);
      if (produtoId)   params.set("produtoId", produtoId);
      const res = await fetch(`/api/etiquetas?${params}`);
      if (res.ok) {
        const json = await res.json();
        setItens(json.data.map((i: EtiquetaItem) => ({ ...i, qtdEtiquetas: 1 })));
      }
    } finally {
      setCarregando(false);
    }
  }, [searchParams]);

  useEffect(() => { carregarVariantes(); }, [carregarVariantes]);

  // Busca manual com debounce
  useEffect(() => {
    if (!busca.trim()) { setResultadosBusca([]); return; }
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/etiquetas?q=${encodeURIComponent(busca.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setResultadosBusca(json.data ?? []);
        }
      } finally {
        setBuscando(false);
      }
    }, 400);
  }, [busca]);

  const adicionarItem = (item: EtiquetaItem) => {
    setItens((prev) => {
      const existe = prev.find((i) => i.id === item.id);
      if (existe) return prev.map((i) => i.id === item.id ? { ...i, qtdEtiquetas: i.qtdEtiquetas + 1 } : i);
      return [...prev, { ...item, qtdEtiquetas: 1 }];
    });
    setBusca("");
    setResultadosBusca([]);
  };

  const setQtd = (id: string, delta: number) =>
    setItens((prev) => prev.map((i) =>
      i.id === id ? { ...i, qtdEtiquetas: Math.max(1, Math.min(99, i.qtdEtiquetas + delta)) } : i
    ));

  const remover = (id: string) => setItens((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="space-y-4">
      {/* ── Controles (somem na impressão) ── */}
      <div className="no-print space-y-4">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/produtos"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Impressão de Etiquetas</h1>
            <p className="text-sm text-muted-foreground">
              {itens.length} produto(s) · {listaImprimir.length} etiqueta(s) · {totalFolhas} folha(s) A4
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMostrarConfig(!mostrarConfig)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button onClick={() => window.print()} disabled={listaImprimir.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>

        {/* Configurações */}
        {mostrarConfig && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-1 max-w-xs">
                <Label className="text-xs">Iniciar na etiqueta nº (1–33)</Label>
                <Input
                  type="number" min={1} max={33}
                  value={inicioEtiqueta}
                  onChange={(e) => setInicioEtiqueta(Math.max(1, Math.min(33, Number(e.target.value))))}
                  className="w-24 h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Permite reaproveitar folhas parcialmente usadas
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Busca manual de produtos */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto pelo nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
          {buscando && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
          {resultadosBusca.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
              {resultadosBusca.map((item) => (
                <button
                  key={item.id}
                  onClick={() => adicionarItem(item)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                >
                  <span className="flex-1 truncate">
                    <span className="font-medium">{item.nome}</span>
                    {(item.cor || item.tamanho) && (
                      <span className="text-muted-foreground ml-1">
                        — {[item.cor, item.tamanho].filter(Boolean).join(" / ")}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {item.codigoInterno ?? ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de itens selecionados */}
        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : itens.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <p className="text-muted-foreground">Nenhum produto selecionado.</p>
              <p className="text-sm text-muted-foreground">
                Use a busca acima, ou acesse <strong>Produtos</strong> / <strong>Categorias</strong> e clique em 🏷️ Etiquetas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Produtos selecionados</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => setItens([])}>
                Limpar tudo
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-72 overflow-y-auto">
                {itens.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {[item.cor, item.tamanho].filter(Boolean).join(" / ") || "—"}
                        {item.codigoInterno && ` · REF: ${item.codigoInterno}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{item.qtdEtiquetas}x</Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQtd(item.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQtd(item.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remover(item.id)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {listaImprimir.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Preview (escala 60%) — {totalFolhas} folha(s) A4 · 33 etiquetas/folha · mostrando 1ª folha
            </p>
            <div className="overflow-x-auto border rounded-lg bg-gray-50 p-4">
              <div style={{ transform: "scale(0.6)", transformOrigin: "top left", width: "196.1mm", height: `${Math.min(totalFolhas, 1) * 279.4}mm`, display: "inline-block" }}>
                <div className="etiqueta-grid">
                  {Array(vazias).fill(null).map((_, i) => <div key={`v${i}`} className="etiqueta-vazia" />)}
                  {listaImprimir.slice(0, 33 - vazias).map((item, i) => (
                    <Etiqueta key={`p${i}`} item={item} nomeLoja={nomeLoja} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Área de impressão (só aparece no print) ── */}
      {listaImprimir.length > 0 && (
        <div className="etiqueta-folha">
          <div className="etiqueta-grid">
            {Array(vazias).fill(null).map((_, i) => <div key={`v${i}`} className="etiqueta-vazia" />)}
            {listaImprimir.map((item, i) => (
              <Etiqueta key={`${item.id}-${i}`} item={item} nomeLoja={nomeLoja} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
