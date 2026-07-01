"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Save, Upload, FileText, Truck, Receipt,
  Package, CheckCircle2, ChevronLeft, ChevronRight, Search, Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { NFeParseResult } from "@/lib/xml-nfe";
import { formatCurrency } from "@/lib/utils";
import { UploadDocumentoEntrada, type DocumentoExtraido } from "@/components/upload-documento-entrada";

type StepProps = {
  step: number;
  current: number;
  children: React.ReactNode;
  label: string;
};

function Step({ step, current, children, label }: StepProps) {
  const isActive = step === current;
  const isDone = step < current;
  return (
    <div className={`${isActive ? "" : "hidden"}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
          isDone ? "bg-green-500 text-white" :
          isActive ? "bg-primary text-primary-foreground" :
          "bg-muted text-muted-foreground"
        }`}>
          {isDone ? <CheckCircle2 className="h-5 w-5" /> : step}
        </div>
        <span className={`text-sm font-medium ${isActive ? "" : "text-muted-foreground"}`}>{label}</span>
        {step < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      {children}
    </div>
  );
}

type VarianteOption = {
  id: string;
  cor: string;
  tamanho: string;
  codigoBarras: string;
  precoVenda: number;
  produto: { id: string; nome: string };
};

type ItemForm = {
  nItem: number;
  nomeXML: string;
  nomeEditado: string;
  codigoProduto: string;
  codigoBarras: string;
  varianteId: string;
  categoriaId: string;
  quantidade: number;
  precoUnitario: number;
  margemLucro: string;
  precoVendaManual: string;
  valorICMS: number;
  valorPIS: number;
  valorCOFINS: number;
};

export default function NovaEntradaPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [variantes, setVariantes] = useState<VarianteOption[]>([]);
  const [parsedXml, setParsedXml] = useState<NFeParseResult | null>(null);
  const [buscandoXml, setBuscandoXml] = useState(false);
  const [mostrarUploadIA, setMostrarUploadIA] = useState(false);

  // Step 1 - Dados da Nota
  const [xmlContent, setXmlContent] = useState("");
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [numeroNFe, setNumeroNFe] = useState("");
  const [serieNFe, setSerieNFe] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [cfop, setCfop] = useState("");
  const [naturezaOperacao, setNaturezaOperacao] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [xmlFileName, setXmlFileName] = useState("");

  // Step 2 - Despesas e Impostos
  const [valorFrete, setValorFrete] = useState("");
  const [valorSeguro, setValorSeguro] = useState("");
  const [valorDespesas, setValorDespesas] = useState("");
  const [valorDesconto, setValorDesconto] = useState("");
  const [valorICMS, setValorICMS] = useState("");
  const [valorPIS, setValorPIS] = useState("");
  const [valorCOFINS, setValorCOFINS] = useState("");
  const [margemPadrao, setMargemPadrao] = useState("60");
  const [gerarContasPagar, setGerarContasPagar] = useState(true);

  // Step 3 - Produtos
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [buscaProduto, setBuscaProduto] = useState<Record<number, string>>({});
  const [criandoProdutos, setCriandoProdutos] = useState(false);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);

  // Step 4 - Finalizar
  const [observacao, setObservacao] = useState("");
  const [parcelas, setParcelas] = useState<{ numero: string; valor: number; vencimento: string }[]>([]);

  useEffect(() => {
    fetch("/api/fornecedores").then((r) => r.ok && r.json()).then(setFornecedores).catch(() => {});
    fetch("/api/categorias").then((r) => r.ok && r.json()).then(setCategorias).catch(() => {});
    fetch("/api/produtos?all=true").then((r) => r.ok && r.json()).then((prods) => {
      const v: VarianteOption[] = [];
      if (Array.isArray(prods)) {
        for (const p of prods) {
          if (p.variantes && Array.isArray(p.variantes)) {
            for (const va of p.variantes) {
              v.push({
                id: va.id,
                cor: va.cor || "",
                tamanho: va.tamanho || "",
                codigoBarras: va.codigoBarras || "",
                precoVenda: Number(va.precoVenda || p.precoVenda || 0),
                produto: { id: p.id, nome: p.nome },
              });
            }
          }
        }
      }
      setVariantes(v);
    }).catch(() => {});
  }, []);

  const applyXmlData = useCallback((parsed: NFeParseResult & { fornecedorId?: string; fornecedorCriado?: boolean }) => {
    setChaveAcesso(parsed.chaveAcesso);
    setNumeroNFe(parsed.numeroNFe);
    setSerieNFe(String(parsed.serieNFe));
    setDataEmissao(parsed.dataEmissao.split("T")[0] || parsed.dataEmissao);
    setCfop(parsed.cfop);
    setNaturezaOperacao(parsed.naturezaOperacao);

    setValorFrete(String(parsed.valorFrete || ""));
    setValorSeguro(String(parsed.valorSeguro || ""));
    setValorDespesas(String(parsed.valorDespesas || ""));
    setValorDesconto(String(parsed.valorDesconto || ""));
    setValorICMS(String(parsed.valorICMS || ""));
    setValorPIS(String(parsed.valorPIS || ""));
    setValorCOFINS(String(parsed.valorCOFINS || ""));

    const items = parsed.itens.map((i) => ({
      nItem: i.nItem,
      nomeXML: i.nome,
      nomeEditado: i.nome,
      codigoProduto: i.codigoProduto,
      codigoBarras: i.codigoBarras,
      varianteId: "",
      categoriaId: "",
      quantidade: i.quantidade,
      precoUnitario: i.valorUnitario,
      margemLucro: "",
      precoVendaManual: "",
      valorICMS: i.valorICMS,
      valorPIS: i.valorPIS,
      valorCOFINS: i.valorCOFINS,
    }));
    setItens(items);

    if (parsed.parcelas.length > 0) {
      setParcelas(parsed.parcelas);
    }

    if (parsed.fornecedorId) {
      setFornecedorId(parsed.fornecedorId);
      if (parsed.fornecedorCriado) {
        const novo = { id: parsed.fornecedorId, nome: parsed.fornecedorNome, cnpj: parsed.fornecedorCNPJ?.replace(/\D/g, "") };
        setFornecedores((prev) => {
          if (prev.some((f) => f.id === novo.id)) return prev;
          return [...prev, novo];
        });
      }
    }
  }, []);

  // Aplica dados extraídos pelo upload com IA
  const applyDocumentoIA = useCallback(async (doc: DocumentoExtraido) => {
    setMostrarUploadIA(false);

    // Dados do cabeçalho
    setNumeroNFe(doc.numeroDocumento ?? "");
    setDataEmissao(doc.dataEmissao ?? "");
    setValorFrete(doc.valorFrete ? String(doc.valorFrete) : "");

    // Fornecedor — tenta vincular pelo CNPJ
    if (doc.fornecedor.cnpj) {
      const cnpjLimpo = doc.fornecedor.cnpj.replace(/\D/g, "");
      const forc = fornecedores.find((f) => f.cnpj?.replace(/\D/g, "") === cnpjLimpo);
      if (forc) {
        setFornecedorId(forc.id);
      } else if (doc.fornecedor.nome) {
        // Auto-cadastra fornecedor
        try {
          const res = await fetch("/api/fornecedores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: doc.fornecedor.nome, cnpj: cnpjLimpo }),
          });
          if (res.ok) {
            const novo = await res.json();
            setFornecedores((prev) => [...prev, novo]);
            setFornecedorId(novo.id);
          }
        } catch {/* silencia */}
      }
    }

    // Monta itens
    const novosItens: ItemForm[] = doc.itens.map((item, idx) => ({
      nItem: idx + 1,
      nomeXML: [item.descricao, item.marca, item.cor, item.tamanho].filter(Boolean).join(" "),
      nomeEditado: [item.descricao, item.marca, item.cor, item.tamanho].filter(Boolean).join(" "),
      codigoProduto: item.codigo ?? `IA-${idx + 1}`,
      varianteId: "",
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      margemLucro: "",
      precoVendaManual: "",
      valorICMS: 0,
      valorPIS: 0,
      valorCOFINS: 0,
    }));
    setItens(novosItens);

    // Vai direto para o step de produtos
    setStep(3);
  }, [fornecedores]);

  async function handleXmlUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setXmlFileName(file.name);
    const text = await file.text();
    setXmlContent(text);
    setBuscandoXml(true);
    setErro("");
    try {
      const res = await fetch("/api/entradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse-xml", xmlContent: text }),
      });
      if (!res.ok) { setErro("Erro ao processar XML"); return; }
      const parsed: NFeParseResult = await res.json();
      setParsedXml(parsed);
      applyXmlData(parsed);
    } catch { setErro("Erro ao processar XML"); }
    finally { setBuscandoXml(false); }
  }

  function handleXmlPaste() {
    if (!xmlContent.trim()) return;
    setBuscandoXml(true);
    setErro("");
    fetch("/api/entradas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "parse-xml", xmlContent }),
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((parsed: NFeParseResult) => {
        setParsedXml(parsed);
        applyXmlData(parsed);
      })
      .catch(() => setErro("Erro ao processar XML"))
      .finally(() => setBuscandoXml(false));
  }

  function getFilteredVariantes(search: string): VarianteOption[] {
    if (!search) return [];
    const s = search.toLowerCase();
    return variantes.filter(
      (v) =>
        v.produto.nome.toLowerCase().includes(s) ||
        v.codigoBarras.toLowerCase().includes(s) ||
        v.cor.toLowerCase().includes(s) ||
        v.tamanho.toLowerCase().includes(s)
    );
  }

  function selectVariante(nItem: number, varianteId: string) {
    setItens((prev) =>
      prev.map((i) => (i.nItem === nItem ? { ...i, varianteId } : i))
    );
  }

  function updateQuantidade(nItem: number, quantidade: number) {
    setItens((prev) =>
      prev.map((i) => (i.nItem === nItem ? { ...i, quantidade } : i))
    );
  }

  function updateMargem(nItem: number, margemLucro: string) {
    setItens((prev) =>
      prev.map((i) => (i.nItem === nItem ? { ...i, margemLucro } : i))
    );
  }

  function updateNomeEditado(nItem: number, nomeEditado: string) {
    setItens((prev) =>
      prev.map((i) => (i.nItem === nItem ? { ...i, nomeEditado } : i))
    );
  }

  function updateCategoriaId(nItem: number, categoriaId: string) {
    setItens((prev) =>
      prev.map((i) => (i.nItem === nItem ? { ...i, categoriaId } : i))
    );
  }

  function updatePrecoVendaManual(nItem: number, value: string) {
    const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
    setItens((prev) =>
      prev.map((i) => (i.nItem === nItem ? { ...i, precoVendaManual: cleaned } : i))
    );
  }

  async function handleAutoCriarProdutos() {
    setCriandoProdutos(true);
    setErro("");
    const map = await executarAutoCriacaoProdutos();
    if (!map) { setErro("Erro ao criar produtos"); setCriandoProdutos(false); return; }
    setItens((prev) => prev.map((i) => {
      const vid = map.get(i.nItem);
      return vid ? { ...i, varianteId: vid } : i;
    }));
    await refreshVariantes();
    setCriandoProdutos(false);
  }

  async function executarAutoCriacaoProdutos(): Promise<Map<number, string> | null> {
    try {
      const res = await fetch("/api/entradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto-criar-produtos",
          fornecedorId: fornecedorId || null,
          itens: itens.map((i) => ({
            nItem: i.nItem,
            nome: i.nomeEditado || i.nomeXML,
            codigoProduto: i.codigoProduto,
            codigoBarras: i.codigoBarras || null,
            precoUnitario: i.precoUnitario,
            categoriaId: i.categoriaId || null,
          })),
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error("[auto-criar-produtos]", errJson);
        setErro(errJson.message || errJson.error || "Falha ao criar produtos automaticamente");
        return null;
      }
      const data = await res.json();
      const map = new Map<number, string>();
      const erros: string[] = [];
      for (const item of data.itens ?? []) {
        if (item.varianteId) {
          map.set(item.nItem, item.varianteId);
        } else if (item.erro) {
          erros.push(`Item ${item.nItem}: ${item.erro}`);
        }
      }
      if (erros.length > 0 && map.size === 0) {
        setErro(`Erros ao criar produtos:\n${erros.slice(0, 3).join("\n")}`);
      }
      return map;
    } catch (e: unknown) {
      console.error("[auto-criar-produtos] catch:", e);
      setErro("Erro de conexão ao criar produtos");
      return null;
    }
  }

  async function refreshVariantes() {
    try {
      const res = await fetch("/api/produtos?all=true");
      if (!res.ok) return;
      const prods = await res.json();
      const v: VarianteOption[] = [];
      if (Array.isArray(prods)) {
        for (const p of prods) {
          if (p.variantes && Array.isArray(p.variantes)) {
            for (const va of p.variantes) {
              v.push({
                id: va.id,
                cor: va.cor || "",
                tamanho: va.tamanho || "",
                codigoBarras: va.codigoBarras || "",
                precoVenda: Number(va.precoVenda || p.precoVenda || 0),
                produto: { id: p.id, nome: p.nome },
              });
            }
          }
        }
      }
      setVariantes(v);
    } catch { /* ignore */ }
  }

  const calcDespesas = () => {
    const frete = parseFloat(valorFrete) || 0;
    const despesas = parseFloat(valorDespesas) || 0;
    const seguro = parseFloat(valorSeguro) || 0;
    const desconto = parseFloat(valorDesconto) || 0;
    const icms = parseFloat(valorICMS) || 0;
    const pis = parseFloat(valorPIS) || 0;
    const cofins = parseFloat(valorCOFINS) || 0;
    return { frete, despesas, seguro, desconto, icms, pis, cofins };
  };

  function calcularItem(item: ItemForm, desp: ReturnType<typeof calcDespesas>) {
    const valorTotalItens = itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
    if (valorTotalItens === 0) return { custoUnitario: item.precoUnitario, precoVendaCalculado: 0 };
    const peso = (item.precoUnitario * item.quantidade) / valorTotalItens;
    const totalDespesasRateio = desp.frete + desp.despesas + desp.seguro - desp.desconto;
    const totalImpostosRateio = desp.icms + desp.pis + desp.cofins;
    const freteItem = (totalDespesasRateio * peso) / item.quantidade;
    const impostoItem = (totalImpostosRateio * peso) / item.quantidade;
    const custoUnitario = item.precoUnitario + freteItem + impostoItem;
    const margem = item.margemLucro ? parseFloat(item.margemLucro) : parseFloat(margemPadrao) || 0;
    const precoVendaCalculado = margem > 0 && margem < 100
      ? custoUnitario / (1 - margem / 100)
      : custoUnitario;
    return { custoUnitario, precoVendaCalculado };
  }

  function canProceedStep(s: number): boolean {
    if (s === 1) return !!(fornecedorId || parsedXml);
    if (s === 2) return true;
    if (s === 3) return itens.length > 0;
    return true;
  }

  async function enviarEntrada(
    itensParaEnvio: { varianteId: string; quantidade: number; precoUnitario: number; margemLucro?: number; precoVendaSugerido?: number; valorICMS?: number; valorPIS?: number; valorCOFINS?: number }[],
    valorTotal: number
  ) {
    const totalFrete = parseFloat(valorFrete) || 0;
    const totalSeguro = parseFloat(valorSeguro) || 0;
    const totalDespesas = parseFloat(valorDespesas) || 0;
    const totalDesconto = parseFloat(valorDesconto) || 0;
    const totalICMS = parseFloat(valorICMS) || 0;
    const totalPIS = parseFloat(valorPIS) || 0;
    const totalCOFINS = parseFloat(valorCOFINS) || 0;

    const data = {
      fornecedorId: fornecedorId || undefined,
      chaveAcesso: chaveAcesso || undefined,
      numeroNFe: numeroNFe || undefined,
      serieNFe: serieNFe ? parseInt(serieNFe) : undefined,
      dataEmissao: dataEmissao || undefined,
      cfop: cfop || undefined,
      naturezaOperacao: naturezaOperacao || undefined,
      valorFrete: totalFrete || undefined,
      valorSeguro: totalSeguro || undefined,
      valorDespesas: totalDespesas || undefined,
      valorDesconto: totalDesconto || undefined,
      valorICMS: totalICMS || undefined,
      valorPIS: totalPIS || undefined,
      valorCOFINS: totalCOFINS || undefined,
      xmlOriginal: xmlContent || undefined,
      margemLucroPadrao: parseFloat(margemPadrao) || undefined,
      gerarContasPagar,
      valorTotal,
      parcelas: gerarContasPagar ? parcelas : [],
      observacao: observacao || undefined,
      itens: itensParaEnvio,
    };

    try {
      const res = await fetch("/api/entradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || err.issues?.[0]?.message || "Erro ao registrar entrada");
        return;
      }

      router.push("/entradas");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSubmit() {
    setErro("");
    setSalvando(true);

    const totalFrete = parseFloat(valorFrete) || 0;
    const totalSeguro = parseFloat(valorSeguro) || 0;
    const totalDespesas = parseFloat(valorDespesas) || 0;
    const totalDesconto = parseFloat(valorDesconto) || 0;
    const totalICMS = parseFloat(valorICMS) || 0;
    const totalPIS = parseFloat(valorPIS) || 0;
    const totalCOFINS = parseFloat(valorCOFINS) || 0;

    const itensValidos = itens.filter((i) => i.varianteId);

    if (itensValidos.length === 0) {
      setErro("");
      setSalvando(true);
      const map = await executarAutoCriacaoProdutos();
      if (!map || map.size === 0) {
        setErro("Nenhum produto foi criado. Verifique os dados do XML.");
        setSalvando(false);
        return;
      }
      refreshVariantes();
      const novosItens = itens
        .filter((i) => map.has(i.nItem))
        .map((i) => ({
          varianteId: map.get(i.nItem)!,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario,
          margemLucro: i.margemLucro ? parseFloat(i.margemLucro) : undefined,
          precoVendaSugerido: i.precoVendaManual ? parseFloat(i.precoVendaManual) : undefined,
          valorICMS: i.valorICMS || undefined,
          valorPIS: i.valorPIS || undefined,
          valorCOFINS: i.valorCOFINS || undefined,
        }));
      const valorProdutosAuto = novosItens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
      const valorTotalAuto = valorProdutosAuto + totalFrete + totalSeguro + totalDespesas - totalDesconto;
      await enviarEntrada(novosItens, valorTotalAuto);
      return;
    }

    const valorProdutos = itensValidos.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
    const valorTotal = valorProdutos + totalFrete + totalSeguro + totalDespesas - totalDesconto;
    await enviarEntrada(
      itensValidos.map((i) => ({
        varianteId: i.varianteId,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        margemLucro: i.margemLucro ? parseFloat(i.margemLucro) : undefined,
        precoVendaSugerido: i.precoVendaManual ? parseFloat(i.precoVendaManual) : undefined,
        valorICMS: i.valorICMS || undefined,
        valorPIS: i.valorPIS || undefined,
        valorCOFINS: i.valorCOFINS || undefined,
      })),
      valorTotal
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/entradas">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Entrada</h1>
          <p className="text-muted-foreground">Registre a chegada de mercadorias no estoque</p>
        </div>
      </div>

      {erro && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 4) {
            if (canProceedStep(step)) setStep(step + 1);
            else setErro("Preencha todos os campos obrigatórios antes de continuar.");
          } else {
            handleSubmit();
          }
        }}
      >
        <div className="flex items-center justify-center gap-1 mb-8">
          {["Dados da Nota", "Despesas", "Produtos", "Finalizar"].map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStep(i + 1)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : step > i + 1
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > i + 1 ? <CheckCircle2 className="h-3 w-3" /> : null}
                {label}
              </button>
              {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1 - Dados da Nota */}
        <Step step={1} current={step} label="Dados da Nota">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Informações da Nota Fiscal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Upload com IA */}
              {mostrarUploadIA ? (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Leitura automática por IA
                  </p>
                  <UploadDocumentoEntrada
                    onConfirmar={applyDocumentoIA}
                    onCancelar={() => setMostrarUploadIA(false)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarUploadIA(true)}
                  className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 p-4 text-left transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Usar IA para ler foto ou PDF</p>
                    <p className="text-xs text-muted-foreground">
                      Envie uma foto da nota, pedido ou orçamento — a IA extrai os dados automaticamente
                    </p>
                  </div>
                </button>
              )}

              <div className="rounded-lg border border-dashed p-6">
                <Label className="mb-2 block text-sm font-medium">Importar XML da NF-e</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Faça upload do XML ou cole o conteúdo abaixo
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <Label
                    htmlFor="xml-upload"
                    className="flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted cursor-pointer text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Selecionar XML
                  </Label>
                  <Input
                    id="xml-upload"
                    type="file"
                    accept=".xml"
                    className="hidden"
                    onChange={handleXmlUpload}
                  />
                  {xmlFileName && (
                    <span className="text-sm text-muted-foreground">{xmlFileName}</span>
                  )}
                </div>
                <textarea
                  value={xmlContent}
                  onChange={(e) => setXmlContent(e.target.value)}
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                  placeholder="Cole o XML da NF-e aqui..."
                  rows={4}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={buscandoXml || !xmlContent.trim()}
                  onClick={handleXmlPaste}
                >
                  {buscandoXml ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Processar XML
                </Button>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Ou preencha manualmente</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-3 space-y-2">
                    <Label htmlFor="chaveAcesso">Chave de Acesso</Label>
                    <Input
                      id="chaveAcesso" value={chaveAcesso}
                      onChange={(e) => setChaveAcesso(e.target.value)}
                      placeholder="3526 0603 9101 0000 1435 5004 0001 8496 5157 6333 788"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numeroNFe">Número NF-e</Label>
                    <Input id="numeroNFe" value={numeroNFe} onChange={(e) => setNumeroNFe(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serie">Série</Label>
                    <Input id="serie" value={serieNFe} onChange={(e) => setSerieNFe(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataEmissao">Data de Emissão</Label>
                    <Input id="dataEmissao" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cfop">CFOP</Label>
                    <Input id="cfop" value={cfop} onChange={(e) => setCfop(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="natureza">Natureza da Operação</Label>
                    <Input id="natureza" value={naturezaOperacao} onChange={(e) => setNaturezaOperacao(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                    <select
                      id="fornecedor"
                      value={fornecedorId}
                      onChange={(e) => setFornecedorId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {fornecedores.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Step>

        {/* Step 2 - Despesas e Impostos */}
        <Step step={2} current={step} label="Despesas">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Despesas Acessórias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="valorFrete">Valor do Frete</Label>
                  <Input id="valorFrete" type="number" step="0.01" value={valorFrete}
                    onChange={(e) => setValorFrete(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorSeguro">Valor do Seguro</Label>
                  <Input id="valorSeguro" type="number" step="0.01" value={valorSeguro}
                    onChange={(e) => setValorSeguro(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorDespesas">Outras Despesas</Label>
                  <Input id="valorDespesas" type="number" step="0.01" value={valorDespesas}
                    onChange={(e) => setValorDespesas(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorDesconto">Desconto</Label>
                  <Input id="valorDesconto" type="number" step="0.01" value={valorDesconto}
                    onChange={(e) => setValorDesconto(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Impostos (Simples Nacional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-700 dark:text-blue-300 mb-3">
                  No Simples Nacional, os impostos <strong>não são recuperáveis</strong> — eles entram como custo do produto.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorICMS">ICMS</Label>
                  <Input id="valorICMS" type="number" step="0.01" value={valorICMS}
                    onChange={(e) => setValorICMS(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorPIS">PIS</Label>
                  <Input id="valorPIS" type="number" step="0.01" value={valorPIS}
                    onChange={(e) => setValorPIS(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorCOFINS">COFINS</Label>
                  <Input id="valorCOFINS" type="number" step="0.01" value={valorCOFINS}
                    onChange={(e) => setValorCOFINS(e.target.value)} />
                </div>
                <div className="border-t pt-4 space-y-2">
                  <Label htmlFor="margemPadrao">Margem de Lucro Padrão (%)</Label>
                  <Input id="margemPadrao" type="number" step="0.01" value={margemPadrao}
                    onChange={(e) => setMargemPadrao(e.target.value)}
                    placeholder="60" />
                  <p className="text-xs text-muted-foreground">
                    Será aplicada aos itens que não tiverem margem individual definida
                  </p>
                </div>
                <div className="border-t pt-4 flex items-center gap-2">
                  <input
                    id="gerarContas"
                    type="checkbox"
                    checked={gerarContasPagar}
                    onChange={(e) => setGerarContasPagar(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <Label htmlFor="gerarContas" className="cursor-pointer">
                    Gerar contas a pagar automaticamente
                  </Label>
                </div>
                {parcelas.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {parcelas.length} parcela(s) do XML serão convertidas em contas a pagar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Step>

        {/* Step 3 - Produtos */}
        <Step step={3} current={step} label="Produtos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Itens da Nota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-700 dark:text-blue-300">
                Os valores incluem rateio de frete, despesas e impostos (Simples Nacional).
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Associe cada item da nota a um produto, ou crie todos automaticamente.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={criandoProdutos}
                  onClick={handleAutoCriarProdutos}
                >
                  {criandoProdutos ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Package className="h-4 w-4 mr-1" />}
                  Criar automático
                </Button>
              </div>
              {itens.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum item encontrado. Importe um XML ou preencha os dados da nota primeiro.
                </div>
              ) : (
                <div className="space-y-4">
                  {itens.map((item, idx) => {
                    const selected = variantes.find((v) => v.id === item.varianteId);
                    const search = buscaProduto[item.nItem] || "";
                    const filtered = search ? getFilteredVariantes(search).slice(0, 5) : [];
                    return (
                      <div key={item.nItem} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">#{item.nItem} — <span className="italic text-muted-foreground">{item.nomeXML}</span></p>
                            <p className="text-xs text-muted-foreground">
                              Cód. fornecedor: {item.codigoProduto} · Qtd: {item.quantidade} · {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.precoUnitario)}/un
                            </p>
                          </div>
                        </div>

                        {/* Campo editar nome — SEMPRE visível para itens sem variante vinculada */}
                        {!selected && (
                          <div className="rounded-md bg-amber-50 border-2 border-amber-300 p-3 space-y-1.5">
                            <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                              ✏️ PRODUTO NOVO — defina o nome antes de finalizar
                            </p>
                            <Input
                              className="text-sm bg-white font-medium border-amber-300 focus:border-amber-500"
                              placeholder="Ex: CALCA JEANS WRANGLER MASCULINO"
                              value={item.nomeEditado ?? item.nomeXML}
                              onChange={(e) => updateNomeEditado(item.nItem, e.target.value)}
                              autoComplete="off"
                            />
                            <div>
                              <Label className="text-[11px] text-amber-700">Categoria</Label>
                              <select
                                className="mt-1 w-full rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                value={item.categoriaId}
                                onChange={(e) => updateCategoriaId(item.nItem, e.target.value)}
                              >
                                <option value="">Sem categoria</option>
                                {categorias.map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                ))}
                              </select>
                            </div>
                            <p className="text-[11px] text-amber-700">
                              Nome original do arquivo: <em>{item.nomeXML}</em>
                            </p>
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1 relative">
                            <Label className="text-xs">Buscar produto</Label>
                            <div className="relative">
                              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-8 text-sm"
                                placeholder="Digite o nome do produto..."
                                value={search}
                                onChange={(e) => setBuscaProduto({ ...buscaProduto, [item.nItem]: e.target.value })}
                              />
                            </div>
                            {search && filtered.length > 0 && (
                              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                                {filtered.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                                      item.varianteId === v.id ? "bg-primary/10" : ""
                                    }`}
                                    onClick={() => {
                                      selectVariante(item.nItem, v.id);
                                      setBuscaProduto({ ...buscaProduto, [item.nItem]: "" });
                                    }}
                                  >
                                    <span className="font-medium">{v.produto.nome}</span>
                                    {v.cor && <span className="text-muted-foreground"> · {v.cor}</span>}
                                    {v.tamanho && <span className="text-muted-foreground"> · {v.tamanho}</span>}
                                    <span className="text-muted-foreground ml-2 text-xs">({v.codigoBarras})</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {selected && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {selected.produto.nome}
                                  {selected.cor && ` · ${selected.cor}`}
                                  {selected.tamanho && ` · ${selected.tamanho}`}
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Margem (%)</Label>
                              <Input
                                className="text-sm"
                                type="number"
                                step="0.01"
                                placeholder={margemPadrao}
                                value={item.margemLucro}
                                onChange={(e) => updateMargem(item.nItem, e.target.value)}
                              />
                            </div>
                            <div className="w-24 space-y-1">
                              <Label className="text-xs">Qtd</Label>
                              <Input
                                className="text-sm text-center"
                                type="number"
                                value={item.quantidade}
                                onChange={(e) => updateQuantidade(item.nItem, parseInt(e.target.value) || 1)}
                              />
                            </div>
                          </div>

                          {(() => {
                            const { custoUnitario, precoVendaCalculado } = calcularItem(item, calcDespesas());
                            const precoFinal = item.precoVendaManual ? parseFloat(item.precoVendaManual) : precoVendaCalculado;
                            const isManual = !!item.precoVendaManual;
                            return (
                              <div className="flex gap-4 items-center pt-2 border-t mt-2">
                                <div className="text-xs text-muted-foreground">
                                  Custo c/ despesas: <span className="font-semibold text-foreground">{formatCurrency(custoUnitario)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-muted-foreground">Preço de venda:</span>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={isManual ? item.precoVendaManual : formatCurrency(precoVendaCalculado)}
                                      onChange={(e) => updatePrecoVendaManual(item.nItem, e.target.value)}
                                      className={`w-32 rounded-md border px-2 py-1 text-xs font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring ${
                                        isManual
                                          ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                                          : "border-muted bg-transparent text-green-700 dark:text-green-400 cursor-text"
                                      }`}
                                    />
                                    {isManual && (
                                      <button
                                        type="button"
                                        onClick={() => updatePrecoVendaManual(item.nItem, "")}
                                        className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-[10px] leading-none"
                                        title="Voltar ao cálculo automático"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </Step>

        {/* Step 4 - Finalizar */}
        <Step step={4} current={step} label="Finalizar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Revisão Final
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium mb-2">Nota Fiscal</h4>
                  <p className="text-xs text-muted-foreground">
                    {numeroNFe ? `NF ${numeroNFe}${serieNFe ? ` Série ${serieNFe}` : ""}` : "Sem NF"}
                  </p>
                  {chaveAcesso && <p className="text-xs font-mono text-muted-foreground break-all mt-1">{chaveAcesso}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Fornecedor: {fornecedores.find((f) => f.id === fornecedorId)?.nome || "—"}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium mb-2">Despesas e Impostos</h4>
                  <p className="text-xs text-muted-foreground">
                    Frete: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(valorFrete) || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ICMS: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(valorICMS) || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margem padrão: {margemPadrao || "60"}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gerarContasPagar ? "Contas a pagar: Sim" : "Contas a pagar: Não"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="px-4 py-3 bg-muted">
                  <h4 className="text-sm font-medium">Produtos ({itens.length})</h4>
                </div>
                <div className="divide-y">
                  {itens.map((item) => {
                    const v = variantes.find((v) => v.id === item.varianteId);
                    const { custoUnitario, precoVendaCalculado } = calcularItem(item, calcDespesas());
                    const precoFinal = item.precoVendaManual ? parseFloat(item.precoVendaManual) : precoVendaCalculado;
                    const isManual = !!item.precoVendaManual;
                    return (
                      <div key={item.nItem} className="px-4 py-2.5 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{v ? v.produto.nome : item.nomeXML}</p>
                          <p className="text-xs text-muted-foreground">
                            {v?.cor && `${v.cor} `}{v?.tamanho && `${v.tamanho} `}· {item.quantidade}x {formatCurrency(item.precoUnitario)}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          {item.margemLucro && <p className="text-muted-foreground">Margem: {item.margemLucro}%</p>}
                          <p>Custo: {formatCurrency(custoUnitario)}</p>
                          <p className={`font-bold ${isManual ? "text-green-600 dark:text-green-300" : "text-green-700 dark:text-green-400"}`}>
                            Venda: {formatCurrency(precoFinal)}
                            {isManual && <span className="text-[10px] ml-1">(manual)</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {parcelas.length > 0 && (
                <div className="rounded-lg border">
                  <div className="px-4 py-3 bg-muted">
                    <h4 className="text-sm font-medium">Parcelas ({parcelas.length})</h4>
                  </div>
                  <div className="divide-y text-sm">
                    {parcelas.map((p, i) => (
                      <div key={i} className="px-4 py-2.5 flex justify-between">
                        <span>Parcela {p.numero || String.fromCharCode(65 + i)}</span>
                        <span className="font-mono">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.valor)}</span>
                        <span className="text-muted-foreground">{p.vencimento ? new Date(p.vencimento).toLocaleDateString("pt-BR") : "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="observacao">Observações</Label>
                <textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Observações sobre esta entrada..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </Step>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/entradas">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={salvando || (step === 4 && !canProceedStep(3))}>
              {step < 4 ? (
                <>
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {step === 4 && (salvando ? "Salvando..." : "Finalizar Entrada")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
