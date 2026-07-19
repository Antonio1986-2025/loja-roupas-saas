"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight, FileText, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface ItemCupom {
  nome: string;
  variante: string;
  quantidade: number;
  preco: number;
  subtotal: number;
}

interface Props {
  venda: {
    numero: number;
    total: number;
    subtotal: number;
    desconto: number;
    formaPagamento: string;
    clienteNome: string | null;
    itens: ItemCupom[];
    createdAt: string;
  };
  vendaId?: string;
  onNovaVenda: () => void;
}

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  BOLETO: "Boleto",
  DUPLICATA: "Duplicata",
  CREDITO_LOJA: "Crédito Loja",
};

function imprimir() {
  const content = document.getElementById("cupom-print");
  if (!content) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>Cupom</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
      h2 { text-align: center; margin: 0 0 4px; font-size: 14px; }
      .header { text-align: center; margin-bottom: 8px; font-size: 11px; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 2px 0; vertical-align: top; }
      .right { text-align: right; }
      .center { text-align: center; }
      .total { font-size: 14px; font-weight: bold; }
      .footer { text-align: center; margin-top: 8px; font-size: 11px; }
    </style></head><body>
    ${content.innerHTML}
    <script>
      window.onload = function() { window.print(); window.close(); };
    <\/script>
    </body></html>
  `);
  win.document.close();
}

export function CupomVenda({ venda, vendaId, onNovaVenda }: Props) {
  const { data: session } = useSession();
  const [emitindoNfe, setEmitindoNfe] = useState(false);
  const [nfeResultado, setNfeResultado] = useState<{ success: boolean; chaveAcesso?: string; message?: string } | null>(null);
  const data = new Date(venda.createdAt);
  const dataStr = data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const emitirNfe = async () => {
    if (!vendaId) return;
    setEmitindoNfe(true);
    setNfeResultado(null);
    try {
      const res = await fetch("/api/nfe/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendaId, tipo: "NFE" }),
      });
      const json = await res.json();
      if (res.ok) {
        setNfeResultado({ success: true, chaveAcesso: json.chaveAcesso });
      } else {
        setNfeResultado({ success: false, message: json.message || json.error || "Erro ao emitir NF-e" });
      }
    } catch {
      setNfeResultado({ success: false, message: "Erro ao conectar com o servidor" });
    } finally {
      setEmitindoNfe(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div
        id="cupom-print"
        className="bg-white border rounded-lg p-6 w-full max-w-sm text-sm"
      >
        <h2 className="text-center font-bold text-base mb-1">{session?.user?.tenantName?.toUpperCase() ?? "STORI"}</h2>
        <p className="text-center text-xs text-muted-foreground mb-3">
          Cupom Não Fiscal
        </p>
        <hr className="border-t border-dashed" />
        <div className="flex justify-between text-xs text-muted-foreground py-1">
          <span>Venda #{venda.numero}</span>
          <span>{dataStr}</span>
        </div>
        {venda.clienteNome && (
          <p className="text-xs text-muted-foreground">Cliente: {venda.clienteNome}</p>
        )}
        <hr className="border-t border-dashed" />

        <div className="py-2">
          {venda.itens.map((item, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <span className="font-medium">{item.nome}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{item.quantidade}x {formatCurrency(item.preco)}</span>
                <span>{item.variante}</span>
              </div>
            </div>
          ))}
        </div>

        <hr className="border-t border-dashed" />
        <div className="space-y-1 py-2">
          <div className="flex justify-between text-xs">
            <span>Subtotal</span>
            <span>{formatCurrency(venda.subtotal)}</span>
          </div>
          {venda.desconto > 0 && (
            <div className="flex justify-between text-xs">
              <span>Desconto</span>
              <span>-{formatCurrency(venda.desconto)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1">
            <span>Total</span>
            <span>{formatCurrency(venda.total)}</span>
          </div>
        </div>

        <hr className="border-t border-dashed" />
        <p className="text-xs text-center py-1">
          Pagamento: {FORMA_LABEL[venda.formaPagamento] || venda.formaPagamento}
        </p>
        <hr className="border-t border-dashed" />

        <p className="text-center text-xs text-muted-foreground mt-3">
          Obrigado pela preferência!
        </p>
      </div>

      {nfeResultado && (
        <div className={`w-full max-w-sm text-sm p-3 rounded-md border ${
          nfeResultado.success
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {nfeResultado.success ? (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">NF-e emitida!</p>
                <p className="text-xs mt-1 break-all font-mono">{nfeResultado.chaveAcesso}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{nfeResultado.message}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {vendaId && !nfeResultado?.success && (
          <Button variant="outline" onClick={emitirNfe} disabled={emitindoNfe}>
            {emitindoNfe ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {emitindoNfe ? "Emitindo..." : "Emitir NFe"}
          </Button>
        )}
        <Button variant="outline" onClick={imprimir}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={onNovaVenda}>
          Nova Venda
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col items-center gap-1 mt-3">
        <hr className="border-t border-dashed w-full" />
        <p className="text-center text-[10px] text-muted-foreground opacity-60">
          Powered by Stori
        </p>
      </div>
    </div>
  );
}
