"use client";

import { useSession } from "next-auth/react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";

interface ItemCupomCond {
  nome: string;
  cor: string | null;
  tamanho: string | null;
  quantidade: number;
  preco: number;
  subtotal: number;
}

interface Props {
  condicional: {
    numero: number;
    clienteNome: string | null;
    clienteTelefone: string | null;
    dataSaida: string;
    dataVencimento: string;
    prazoDias: number;
    observacoes?: string | null;
    itens: ItemCupomCond[];
  };
  onFechar: () => void;
}

function imprimir() {
  const content = document.getElementById("cupom-cond-print");
  if (!content) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>Condicional</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
      h2 { text-align: center; margin: 0 0 4px; font-size: 14px; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 2px 0; vertical-align: top; }
      .right { text-align: right; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .small { font-size: 10px; }
      .total { font-size: 14px; font-weight: bold; }
    </style></head><body>
    ${content.innerHTML}
    <script>window.onload = function() { window.print(); window.close(); };<\/script>
    </body></html>
  `);
  win.document.close();
}

export function CupomCondicional({ condicional, onFechar }: Props) {
  const { data: session } = useSession();
  const total = condicional.itens.reduce((s, i) => s + i.subtotal, 0);

  const dataSaida = new Date(condicional.dataSaida).toLocaleDateString("pt-BR");
  const dataVenc = new Date(condicional.dataVencimento).toLocaleDateString("pt-BR");

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div
        id="cupom-cond-print"
        className="bg-white border rounded-lg p-6 w-full max-w-sm text-sm font-mono"
      >
        {/* Cabecalho */}
        <h2 className="text-center font-bold text-base mb-1">
          {session?.user?.tenantName?.toUpperCase() ?? "STORI"}
        </h2>
        <p className="text-center text-xs text-muted-foreground mb-1">
          Recibo de Condicional
        </p>
        <hr className="border-t border-dashed my-2" />

        {/* Info da condicional */}
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Condicional #{condicional.numero}</span>
          <span>{dataSaida}</span>
        </div>
        {condicional.clienteNome && (
          <p className="text-xs">Cliente: <strong>{condicional.clienteNome}</strong></p>
        )}
        {condicional.clienteTelefone && (
          <p className="text-xs text-muted-foreground">Fone: {condicional.clienteTelefone}</p>
        )}
        <p className="text-xs mt-1">
          Devolução até: <strong>{dataVenc}</strong> ({condicional.prazoDias} dias)
        </p>
        {condicional.observacoes && (
          <p className="text-xs text-muted-foreground mt-1">Obs: {condicional.observacoes}</p>
        )}

        <hr className="border-t border-dashed my-2" />

        {/* Itens */}
        <div className="py-1 space-y-2">
          {condicional.itens.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs">
                <span className="font-medium flex-1 pr-2 truncate">{item.nome}</span>
                <span className="shrink-0">{formatCurrency(item.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  {item.quantidade}x {formatCurrency(item.preco)}
                  {(item.cor || item.tamanho) && ` · ${[item.cor, item.tamanho].filter(Boolean).join("/")} `}
                </span>
              </div>
            </div>
          ))}
        </div>

        <hr className="border-t border-dashed my-2" />

        {/* Total */}
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <hr className="border-t border-dashed my-2" />

        {/* Aviso */}
        <p className="text-center text-xs mt-2">
          Os produtos acima foram retirados em condicional.
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Devolva ou efetue o pagamento até {dataVenc}.
        </p>

        <hr className="border-t border-dashed mt-3" />
        <p className="text-center text-[10px] text-muted-foreground mt-2 opacity-60">
          Powered by Stori
        </p>
      </div>

      {/* Botoes */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={imprimir}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={onFechar}>
          <FileText className="mr-2 h-4 w-4" />
          Ver Condicional
        </Button>
      </div>
    </div>
  );
}