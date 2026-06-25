"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Loader2, RotateCcw, AlertCircle } from "lucide-react";

type VendaItem = {
  id: string;
  quantidade: number;
  qtdDevolvida: number;
  precoUnit: string | number;
  subtotal: string | number;
  variante: {
    id: string;
    cor?: string;
    tamanho?: string;
    produto: { nome: string };
  };
};

type Props = {
  itens: VendaItem[];
  vendaNumero: number;
  clienteNome?: string;
  onConfirm: (data: {
    itens: { vendaItemId: string; quantidade: number }[];
    tipoEstorno: "DINHEIRO" | "CREDITO_LOJA";
    motivo?: string;
  }) => Promise<void>;
  onCancel: () => void;
  carregando: boolean;
  erro?: string;
};

export default function ModalDevolucao({
  itens,
  vendaNumero,
  clienteNome,
  onConfirm,
  onCancel,
  carregando,
  erro,
}: Props) {
  const [selecionados, setSelecionados] = useState<
    Record<string, number>
  >({});
  const [tipoEstorno, setTipoEstorno] = useState<
    "DINHEIRO" | "CREDITO_LOJA"
  >("DINHEIRO");
  const [motivo, setMotivo] = useState("");

  const toggleItem = (itemId: string, qtdDisponivel: number) => {
    setSelecionados((prev) => {
      if (prev[itemId]) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: qtdDisponivel };
    });
  };

  const updateQtd = (itemId: string, qtd: number, max: number) => {
    const val = Math.max(1, Math.min(qtd, max));
    setSelecionados((prev) => ({ ...prev, [itemId]: val }));
  };

  const itemSelecionadoCount = Object.keys(selecionados).length;
  const podeConfirmar = itemSelecionadoCount > 0;

  const totalDevolver = itens
    .filter((i) => selecionados[i.id])
    .reduce((acc, item) => {
      const qtd = selecionados[item.id] || 0;
      const proporcao = qtd / item.quantidade;
      return acc + Number(item.subtotal) * proporcao;
    }, 0);

  const handleSubmit = async () => {
    if (!podeConfirmar) return;
    const itensPayload = Object.entries(selecionados).map(
      ([vendaItemId, quantidade]) => ({ vendaItemId, quantidade })
    );
    await onConfirm({
      itens: itensPayload,
      tipoEstorno,
      motivo: motivo.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-yellow-100 p-2">
            <RotateCcw className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Devolução - Venda #{vendaNumero}</h2>
            {clienteNome && (
              <p className="text-sm text-muted-foreground">{clienteNome}</p>
            )}
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Selecione os itens para devolver
          </h3>
          <div className="space-y-2">
            {itens.map((item) => {
              const qtdDisponivel =
                item.quantidade - (item.qtdDevolvida || 0);
              const selecionado = !!selecionados[item.id];
              const qtdSelecionada = selecionados[item.id] || 0;
              const variacao = [item.variante.cor, item.variante.tamanho]
                .filter(Boolean)
                .join(" / ");

              if (qtdDisponivel <= 0) return null;

              return (
                <div
                  key={item.id}
                  className={`rounded-md border p-3 transition-colors ${
                    selecionado
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => toggleItem(item.id, qtdDisponivel)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {item.variante.produto.nome}
                          </p>
                          {variacao && (
                            <p className="text-xs text-muted-foreground">
                              {variacao}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(Number(item.precoUnit))}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Vendido: {item.quantidade} | Já devolvido:{" "}
                          {item.qtdDevolvida || 0} | Disponível:{" "}
                          {qtdDisponivel}
                        </span>
                        {selecionado && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Qtd:</span>
                            <input
                              type="number"
                              min={1}
                              max={qtdDisponivel}
                              value={qtdSelecionada}
                              onChange={(e) =>
                                updateQtd(
                                  item.id,
                                  Number(e.target.value),
                                  qtdDisponivel
                                )
                              }
                              className="w-16 rounded border px-2 py-0.5 text-xs text-center"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {itens.every(
              (i) => i.quantidade - (i.qtdDevolvida || 0) <= 0
            ) && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Todos os itens já foram totalmente devolvidos
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Tipo de Estorno
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipoEstorno("DINHEIRO")}
              className={`rounded-md border p-3 text-center transition-colors ${
                tipoEstorno === "DINHEIRO"
                  ? "border-yellow-500 bg-yellow-50 ring-1 ring-yellow-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="font-medium text-sm">Dinheiro</p>
              <p className="text-xs text-muted-foreground mt-1">
                Estorna o valor em dinheiro
              </p>
            </button>
            <button
              type="button"
              onClick={() => setTipoEstorno("CREDITO_LOJA")}
              className={`rounded-md border p-3 text-center transition-colors ${
                tipoEstorno === "CREDITO_LOJA"
                  ? "border-yellow-500 bg-yellow-50 ring-1 ring-yellow-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="font-medium text-sm">Crédito na Loja</p>
              <p className="text-xs text-muted-foreground mt-1">
                Cliente ganha crédito para compras futuras
              </p>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
            Motivo (opcional)
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Produto com defeito, cliente não gostou..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[60px]"
            rows={2}
          />
        </div>

        {erro && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Total a estornar:
            </p>
            <p className="text-xl font-bold text-yellow-600">
              {formatCurrency(totalDevolver)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={carregando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!podeConfirmar || carregando}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Devolução"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
