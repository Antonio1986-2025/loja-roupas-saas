"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight } from "lucide-react";

interface ItemCupomCond {
  nome: string;
  variante: string;
  quantidade: number;
  preco: number;
  subtotal: number;
}

interface Props {
  condicional: {
    numero: number;
    total: number;
    prazoDias: number;
    dataSaida: string;
    dataVencimento: string;
    clienteNome: string | null;
    observacoes?: string | null;
    itens: ItemCupomCond[];
  };
  onNova: () => void;
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
      h3 { text-align: center; margin: 0 0 8px; font-size: 11px; font-weight: normal; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
      .bold { font-weight: bold; }
      .center { text-align: center; }
      .small { font-size: 10px; color: #555; }
      .total { font-size: 14px; font-weight: bold; }
      .alerta { border: 1px solid #000; padding: 4px; margin: 6px 0; text-align: center; font-size: 11px; }
    </style></head><body>
    ${content.innerHTML}
    <script>
      window.onload = function() { window.print(); window.close(); };
    <\/script>
    </body></html>
  `);
  win.document.close();
}

export function CupomCondicional({ condicional, onNova }: Props) {
  const { data: session } = useSession();

  const dataSaida = new Date(condicional.dataSaida);
  const dataVenc = new Date(condicional.dataVencimento);

  const dataSaidaStr =
    dataSaida.toLocaleDateString("pt-BR") +
    " " +
    dataSaida.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div
        id="cupom-cond-print"
        className="bg-white border rounded-lg p-6 w-full max-w-sm text-sm"
      >
        {/* Cabeçalho */}
        <h2 className="text-center font-bold text-base mb-1">
          {session?.user?.tenantName?.toUpperCase() ?? "STORI"}
        </h2>
        <p className="text-center text-xs text-muted-foreground mb-1">
          Comprovante de Condicional
        </p>
        <hr className="border-t border-dashed my-2" />

        {/* Info da condicional */}
        <div className="flex justify-between text-xs text-muted-foreground py-1">
          <span>Condicional #{condicional.numero}</span>
          <span>{dataSaidaStr}</span>
        </div>
        {condicional.clienteNome && (
          <p className="text-xs text-muted-foreground">
            Cliente: <strong>{condicional.clienteNome}</strong>
          </p>
        )}
        {condicional.observacoes && (
          <p className="text-xs text-muted-foreground italic mt-1">
            Obs: {condicional.observacoes}
          </p>
        )}
        <hr className="border-t border-dashed my-2" />

        {/* Itens */}
        <div className="py-1">
          {condicional.itens.map((item, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <span className="font-medium">{item.nome}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {item.quantidade}x {formatCurrency(item.preco)}
                </span>
                <span>{item.variante}</span>
              </div>
            </div>
          ))}
        </div>

        <hr className="border-t border-dashed my-2" />

        {/* Total */}
        <div className="flex justify-between font-bold text-base py-1">
          <span>Total</span>
          <span>{formatCurrency(condicional.total)}</span>
        </div>

        <hr className="border-t border-dashed my-2" />

        {/* Prazo — destaque */}
        <div className="border border-dashed rounded p-2 my-2 text-center">
          <p className="text-xs text-muted-foreground">Prazo de devolução</p>
          <p className="font-bold text-sm">
            {formatDate(condicional.dataVencimento)}
          </p>
          <p className="text-xs text-muted-foreground">
            ({condicional.prazoDias} {condicional.prazoDias === 1 ? "dia" : "dias"})
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2">
          Os itens devem ser devolvidos ou pagos até a data acima.
        </p>

        <hr className="border-t border-dashed mt-3" />
        <p className="text-center text-[10px] text-muted-foreground mt-2 opacity-60">
          Powered by Stori
        </p>
      </div>

      {/* Botões */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={imprimir}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button onClick={onNova}>
          Nova Condicional
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}