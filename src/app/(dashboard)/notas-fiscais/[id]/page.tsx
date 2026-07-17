"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Loader2, Printer, Download, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  AUTORIZADA: "bg-green-500", ENVIADA: "bg-yellow-500", REJEITADA: "bg-red-500",
  DENEGADA: "bg-red-600", CANCELADA: "bg-gray-500", DIGITADA: "bg-blue-500",
  INUTILIZADA: "bg-orange-500", ERRO: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  AUTORIZADA: "Autorizada", ENVIADA: "Pendente", REJEITADA: "Rejeitada",
  DENEGADA: "Denegada", CANCELADA: "Cancelada", DIGITADA: "Rascunho",
  INUTILIZADA: "Inutilizada", ERRO: "Erro",
};

export default function DetalheNotaFiscalPage() {
  const router = useRouter();
  const params = useParams();
  const [nota, setNota] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [erroCancelar, setErroCancelar] = useState("");

  useEffect(() => {
    fetch(`/api/nfe/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setNota(d); setCarregando(false); })
      .catch(() => router.push("/notas-fiscais"));
  }, [params.id]);

  async function handleCancelar() {
    if (!justificativa || justificativa.length < 15) {
      setErroCancelar("Justificativa deve ter pelo menos 15 caracteres");
      return;
    }
    setCancelando(true);
    setErroCancelar("");
    try {
      const res = await fetch(`/api/nfe/${params.id}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa }),
      });
      if (res.ok) {
        setShowCancelar(false);
        // Recarregar
        const r = await fetch(`/api/nfe/${params.id}`);
        if (r.ok) setNota(await r.json());
      } else {
        const err = await res.json();
        setErroCancelar(err.message || "Erro ao cancelar");
      }
    } catch { setErroCancelar("Erro de conexão"); }
    finally { setCancelando(false); }
  }

  function handleImprimirDanfe() {
    window.open(`/notas-fiscais/${params.id}/danfe`, "_blank");
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!nota) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notas-fiscais"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            NF-e #{nota.numero}
            <Badge className={`${statusColors[nota.status]} text-white`}>
              {statusLabels[nota.status] || nota.status}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Série {nota.serie} · Modelo {nota.modelo} · {nota.tipo === "NFCE" ? "NFC-e" : "NF-e"}
          </p>
        </div>
        <div className="flex gap-2">
          {nota.status === "AUTORIZADA" && (
            <>
              <Button variant="outline" size="sm" onClick={handleImprimirDanfe}>
                <Printer className="mr-2 h-4 w-4" /> DANFE
              </Button>
              <Button variant="outline" size="sm" className="text-destructive border-destructive" onClick={() => setShowCancelar(true)}>
                <XCircle className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modal cancelamento */}
      {showCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCancelar(false)}>
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Cancelar NF-e</h2>
            <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita. Informe a justificativa:</p>
            <div className="space-y-2">
              <Label>Justificativa (mín. 15 caracteres)</Label>
              <Textarea rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Erro no valor total da nota fiscal" />
            </div>
            {erroCancelar && <p className="text-sm text-destructive">{erroCancelar}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCancelar(false)} className="flex-1">Voltar</Button>
              <Button variant="destructive" onClick={handleCancelar} disabled={cancelando} className="flex-1">
                {cancelando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Cancelamento"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Chave de Acesso</CardTitle></CardHeader>
          <CardContent>
            <p className="font-mono text-xs break-all">{nota.chaveAcesso || "—"}</p>
            {nota.nProt && <p className="text-xs text-muted-foreground mt-1">Protocolo: {nota.nProt}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Dados da Emissão</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Emissão:</span> {formatDateTime(nota.dataEmissao)}</p>
            {nota.dhRecbto && <p><span className="text-muted-foreground">Autorização:</span> {formatDateTime(nota.dhRecbto)}</p>}
            {nota.dataCancelamento && <p><span className="text-muted-foreground">Cancelamento:</span> {formatDateTime(nota.dataCancelamento)}</p>}
            <p><span className="text-muted-foreground">Ambiente:</span> {nota.ambiente === 1 ? "Produção" : "Homologação"}</p>
            {nota.naturezaOperacao && <p><span className="text-muted-foreground">Natureza:</span> {nota.naturezaOperacao}</p>}
            {nota.cStat && <p><span className="text-muted-foreground">cStat:</span> {nota.cStat}{nota.xMotivo ? ` — ${nota.xMotivo}` : ""}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Cliente */}
      {nota.clienteNome && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Destinatário</CardTitle></CardHeader>
          <CardContent className="text-sm grid gap-1 md:grid-cols-2">
            <div>
              <p className="font-medium">{nota.clienteNome}</p>
              <p className="text-muted-foreground">{nota.clienteCpfCnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
              {nota.clienteTelefone && <p className="text-muted-foreground">{nota.clienteTelefone}</p>}
            </div>
            {nota.clienteEndereco && (
              <div>
                <p className="text-muted-foreground">{nota.clienteEndereco}{nota.clienteNumero ? `, ${nota.clienteNumero}` : ""}</p>
                <p className="text-muted-foreground">{nota.clienteBairro}</p>
                <p className="text-muted-foreground">{nota.clienteCidade} / {nota.clienteEstado} · {nota.clienteCep}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Itens */}
      {nota.itens && nota.itens.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Itens ({nota.itens.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2">Produto</th>
                  <th className="text-right py-2">Qtd</th>
                  <th className="text-right py-2">Unit.</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-center py-2">CFOP</th>
                  <th className="text-center py-2">NCM</th>
                </tr>
              </thead>
              <tbody>
                {nota.itens.map((item: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{item.variante?.produto?.nome || "—"}</td>
                    <td className="text-right py-2">{item.quantidade}</td>
                    <td className="text-right py-2">{formatCurrency(Number(item.precoUnitario))}</td>
                    <td className="text-right py-2 font-medium">{formatCurrency(Number(item.valorTotal))}</td>
                    <td className="text-center py-2 text-muted-foreground">{item.cfop || "—"}</td>
                    <td className="text-center py-2 text-muted-foreground font-mono text-xs">{item.ncm || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Totais */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Totais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Produtos</p>
              <p className="font-medium">{formatCurrency(Number(nota.valorProdutos || nota.valorTotal))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Desconto</p>
              <p className="font-medium">{formatCurrency(Number(nota.valorDesconto || 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">ICMS</p>
              <p className="font-medium">{formatCurrency(Number(nota.valorICMS || 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="text-lg font-bold">{formatCurrency(Number(nota.valorTotal))}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vínculo com venda */}
      {nota.venda && (
        <div className="text-sm text-muted-foreground text-center">
          <Link href={`/vendas/${nota.vendaId}`} className="underline hover:text-foreground">
            Ver venda #{nota.venda.numero}
          </Link>
        </div>
      )}
    </div>
  );
}
