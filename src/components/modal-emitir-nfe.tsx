"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, AlertCircle, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

type Props = {
  vendaId: string;
  vendaNumero: number;
  vendaTotal: number;
  clienteNome?: string;
  clienteCpf?: string;
  onClose: () => void;
  onSuccess: (dados: any) => void;
};

export default function ModalEmitirNFe({ vendaId, vendaNumero, vendaTotal, clienteNome, clienteCpf, onClose, onSuccess }: Props) {
  const [tipo, setTipo] = useState<"NFE" | "NFCE">("NFE");
  const [emitindo, setEmitindo] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<any>(null);

  const podeEmitir = true; // clienteCpf ou NF-e consumidor final

  async function handleEmitir() {
    setEmitindo(true);
    setErro("");
    try {
      const res = await fetch("/api/nfe/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendaId, tipo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.message || data.error || "Erro ao emitir NF-e");
        return;
      }
      setResultado(data);
      onSuccess(data);
    } catch (e: any) {
      setErro(e.message || "Erro de conexão");
    } finally {
      setEmitindo(false);
    }
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (resultado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-green-700">NF-e Emitida!</h2>
              <p className="text-sm text-muted-foreground">
                {resultado.status === "AUTORIZADA" ? "Autorizada pela SEFAZ" : resultado.status}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chave de Acesso:</span>
              <span className="font-mono text-xs">{resultado.chaveAcesso}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Protocolo:</span>
              <span className="font-bold">{resultado.protocolo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número:</span>
              <span className="font-bold">#{resultado.numero} Série {resultado.serie}</span>
            </div>
            {resultado.xMotivo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SEFAZ:</span>
                <span>{resultado.xMotivo}</span>
              </div>
            )}
          </div>

          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Emitir Nota Fiscal</h2>
            <p className="text-sm text-muted-foreground">Venda #{vendaNumero} · {formatCurrency(vendaTotal)}</p>
          </div>
        </div>

        {clienteNome && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Cliente: </span>
            <span className="font-medium">{clienteNome}</span>
            {clienteCpf && <span className="text-muted-foreground ml-2">· CPF: {clienteCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</span>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTipo("NFE")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              tipo === "NFE"
                ? "border-blue-500 bg-blue-50"
                : "border-muted hover:border-blue-200"
            }`}
          >
            <FileText className="h-5 w-5 mb-2 text-blue-600" />
            <p className="font-bold text-sm">NF-e</p>
            <p className="text-xs text-muted-foreground">Modelo 55</p>
            <p className="text-xs text-muted-foreground">CNPJ/CPF obrigatório</p>
          </button>

          <button
            onClick={() => setTipo("NFCE")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              tipo === "NFCE"
                ? "border-green-500 bg-green-50"
                : "border-muted hover:border-green-200"
            }`}
          >
            <FileText className="h-5 w-5 mb-2 text-green-600" />
            <p className="font-bold text-sm">NFC-e</p>
            <p className="text-xs text-muted-foreground">Modelo 65</p>
            <p className="text-xs text-muted-foreground">Consumidor final</p>
          </button>
        </div>

        {erro && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleEmitir} disabled={emitindo} className="flex-1 gap-2">
            {emitindo ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Emitindo...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Emitir {tipo === "NFCE" ? "NFC-e" : "NF-e"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
