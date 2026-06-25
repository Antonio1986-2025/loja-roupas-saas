"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Loader2, DollarSign, ArrowDownCircle, ArrowUpCircle, X, CheckCircle2, AlertTriangle } from "lucide-react";

type CaixaAtual = {
  id: string;
  usuarioNome: string;
  dataAbertura: string;
  saldoInicial: number;
  status: string;
  totalVendas: number;
  totalDinheiro: number;
  totalPix: number;
  totalDebito: number;
  totalCredito: number;
  totalCreditoLoja: number;
  totalBoleto: number;
  totalSuprimentos: number;
  totalSangrias: number;
  saldoAtual: number;
};

export default function CaixaPage() {
  const router = useRouter();
  const [caixa, setCaixa] = useState<CaixaAtual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [saldoInicial, setSaldoInicial] = useState("");
  const [abrindo, setAbrindo] = useState(false);

  const [sangriaValor, setSangriaValor] = useState("");
  const [sangriaDesc, setSangriaDesc] = useState("");
  const [suprimentoValor, setSuprimentoValor] = useState("");
  const [suprimentoDesc, setSuprimentoDesc] = useState("");
  const [processando, setProcessando] = useState(false);

  const [saldoReal, setSaldoReal] = useState("");
  const [fechamentoObs, setFechamentoObs] = useState("");
  const [fechando, setFechando] = useState(false);
  const [fechamentoRes, setFechamentoRes] = useState<{ saldoFinal: number; saldoReal: number; diferenca: number } | null>(null);

  const carregarCaixa = async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/caixa/atual");
      if (res.ok) {
        const json = await res.json();
        setCaixa(json);
      }
    } catch {
      setErro("Erro ao carregar caixa");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarCaixa(); }, []);

  const abrirCaixa = async () => {
    setErro("");
    const valor = Number(saldoInicial);
    if (isNaN(valor) || valor < 0) { setErro("Informe um valor válido"); return; }
    setAbrindo(true);
    try {
      const res = await fetch("/api/caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoInicial: valor }),
      });
      if (res.ok) {
        setSaldoInicial("");
        await carregarCaixa();
      } else {
        const err = await res.json();
        setErro(err.message || "Erro ao abrir caixa");
      }
    } catch {
      setErro("Erro ao conectar");
    } finally {
      setAbrindo(false);
    }
  };

  const fazerSangria = async () => {
    if (!caixa) return;
    setErro("");
    const valor = Number(sangriaValor);
    if (isNaN(valor) || valor <= 0) { setErro("Valor inválido"); return; }
    if (!sangriaDesc.trim()) { setErro("Informe o motivo"); return; }
    setProcessando(true);
    try {
      const res = await fetch(`/api/caixa/${caixa.id}/sangria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor, descricao: sangriaDesc }),
      });
      if (res.ok) {
        setSangriaValor(""); setSangriaDesc("");
        await carregarCaixa();
      } else {
        const err = await res.json();
        setErro(err.message || "Erro ao registrar sangria");
      }
    } catch {
      setErro("Erro ao conectar");
    } finally {
      setProcessando(false);
    }
  };

  const fazerSuprimento = async () => {
    if (!caixa) return;
    setErro("");
    const valor = Number(suprimentoValor);
    if (isNaN(valor) || valor <= 0) { setErro("Valor inválido"); return; }
    if (!suprimentoDesc.trim()) { setErro("Informe o motivo"); return; }
    setProcessando(true);
    try {
      const res = await fetch(`/api/caixa/${caixa.id}/suprimento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor, descricao: suprimentoDesc }),
      });
      if (res.ok) {
        setSuprimentoValor(""); setSuprimentoDesc("");
        await carregarCaixa();
      } else {
        const err = await res.json();
        setErro(err.message || "Erro ao registrar suprimento");
      }
    } catch {
      setErro("Erro ao conectar");
    } finally {
      setProcessando(false);
    }
  };

  const fecharCaixa = async () => {
    if (!caixa) return;
    setErro("");
    const valor = Number(saldoReal);
    if (isNaN(valor) || valor <= 0) { setErro("Informe o valor em dinheiro contado"); return; }
    setFechando(true);
    try {
      const res = await fetch(`/api/caixa/${caixa.id}/fechar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoReal: valor, observacoes: fechamentoObs || undefined }),
      });
      if (res.ok) {
        const json = await res.json();
        setFechamentoRes(json);
        setCaixa(null);
      } else {
        const err = await res.json();
        setErro(err.message || "Erro ao fechar caixa");
      }
    } catch {
      setErro("Erro ao conectar");
    } finally {
      setFechando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (fechamentoRes) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card>
          <CardHeader><CardTitle>Caixa Fechado</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between"><span>Saldo Esperado</span><span className="font-semibold">{formatCurrency(fechamentoRes.saldoFinal)}</span></div>
            <div className="flex justify-between"><span>Saldo Real Contado</span><span className="font-semibold">{formatCurrency(fechamentoRes.saldoReal)}</span></div>
            <div className={`flex justify-between text-lg font-bold pt-2 border-t ${fechamentoRes.diferenca >= 0 ? "text-green-600" : "text-destructive"}`}>
              <span>Diferença</span>
              <span>{fechamentoRes.diferenca >= 0 ? "+" : ""}{formatCurrency(fechamentoRes.diferenca)}</span>
            </div>
            {fechamentoRes.diferenca !== 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {fechamentoRes.diferenca > 0 ? "Sobra de caixa" : "Falta de caixa"} — verifique o motivo
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => { setFechamentoRes(null); carregarCaixa(); }}>Ir para Caixa</Button>
              <Button variant="outline" onClick={() => router.push("/caixa/historico")}>Histórico</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!caixa) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader><CardTitle>Abrir Caixa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para iniciar as vendas no PDV, abra o caixa informando o valor do fundo de troco.
            </p>
            <div>
              <label className="text-sm font-medium">Saldo Inicial (Fundo de Troco)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                placeholder="0,00"
                className="mt-1"
                autoFocus
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button onClick={abrirCaixa} disabled={abrindo} className="w-full">
              {abrindo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Abrir Caixa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Caixa</h1>
        <Badge variant="default" className="text-sm px-3 py-1">
          Aberto desde {formatDateTime(caixa.dataAbertura)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo Inicial</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(caixa.saldoInicial)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo Atual (Dinheiro)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(caixa.saldoAtual)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vendas Hoje</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{caixa.totalVendas}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Operador</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-sm">{caixa.usuarioNome}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Vendas por Forma de Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">💵 Dinheiro</span><span className="font-medium">{formatCurrency(caixa.totalDinheiro)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">⚡ PIX</span><span className="font-medium">{formatCurrency(caixa.totalPix)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">💳 Débito</span><span className="font-medium">{formatCurrency(caixa.totalDebito)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">💳 Crédito</span><span className="font-medium">{formatCurrency(caixa.totalCredito)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">🏦 Crédito Loja</span><span className="font-medium">{formatCurrency(caixa.totalCreditoLoja)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">📄 Boleto</span><span className="font-medium">{formatCurrency(caixa.totalBoleto)}</span></div>
            <hr />
            <div className="flex justify-between text-sm font-bold"><span>Total</span><span>{formatCurrency(caixa.totalDinheiro + caixa.totalPix + caixa.totalDebito + caixa.totalCredito + caixa.totalCreditoLoja + caixa.totalBoleto)}</span></div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Movimentações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">💰 Suprimentos</span><span className="font-medium text-green-600">{formatCurrency(caixa.totalSuprimentos)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">🏧 Sangrias</span><span className="font-medium text-destructive">{formatCurrency(caixa.totalSangrias)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Sangria</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input type="number" min={0.01} step={0.01} value={sangriaValor} onChange={(e) => setSangriaValor(e.target.value)} placeholder="Valor" className="h-8 text-sm" />
              <Input value={sangriaDesc} onChange={(e) => setSangriaDesc(e.target.value)} placeholder="Motivo" className="h-8 text-sm" />
              <Button size="sm" variant="destructive" className="w-full" onClick={fazerSangria} disabled={processando || !sangriaValor || !sangriaDesc}>
                {processando ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowDownCircle className="h-3 w-3 mr-1" />}
                Registrar Sangria
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Suprimento</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input type="number" min={0.01} step={0.01} value={suprimentoValor} onChange={(e) => setSuprimentoValor(e.target.value)} placeholder="Valor" className="h-8 text-sm" />
              <Input value={suprimentoDesc} onChange={(e) => setSuprimentoDesc(e.target.value)} placeholder="Motivo" className="h-8 text-sm" />
              <Button size="sm" variant="default" className="w-full" onClick={fazerSuprimento} disabled={processando || !suprimentoValor || !suprimentoDesc}>
                {processando ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowUpCircle className="h-3 w-3 mr-1" />}
                Registrar Suprimento
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-destructive/20">
        <CardHeader><CardTitle className="text-destructive">Fechar Caixa</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conte o dinheiro físico na gaveta do caixa e informe o valor abaixo. O sistema vai comparar com o esperado.
          </p>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Valor em Dinheiro Contado</label>
              <Input type="number" min={0} step={0.01} value={saldoReal} onChange={(e) => setSaldoReal(e.target.value)} placeholder="0,00" className="mt-1" />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Input value={fechamentoObs} onChange={(e) => setFechamentoObs(e.target.value)} placeholder="Obs." className="mt-1" />
            </div>
            <Button variant="destructive" onClick={fecharCaixa} disabled={fechando || !saldoReal}>
              {fechando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Fechar Caixa
            </Button>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
