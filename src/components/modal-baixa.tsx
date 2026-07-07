"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";

export type BaixaData = {
  dataPagamento: string;       // YYYY-MM-DD
  valorPago: number;
  juros: number;
  multa: number;
  desconto: number;
  formaPagamento: string;
  numeroDocumento: string;
  observacoes: string;
};

type Props = {
  tipo: "pagar" | "receber";
  conta: {
    descricao: string;
    valor: number;
    dataVencimento: string;
    fornecedor?: { nome: string } | null;
    cliente?: { nome: string } | null;
  };
  onConfirmar: (data: BaixaData) => Promise<void>;
  onCancelar: () => void;
};

const FORMAS_PAGAMENTO = [
  { value: "PIX",          label: "⚡ PIX" },
  { value: "DINHEIRO",     label: "💵 Dinheiro" },
  { value: "DEBITO",       label: "💳 Débito" },
  { value: "CREDITO",      label: "💳 Crédito" },
  { value: "BOLETO",       label: "📄 Boleto" },
  { value: "DUPLICATA",    label: "📋 Duplicata" },
  { value: "CREDITO_LOJA", label: "🏪 Crédito Loja" },
];

function hoje(): string {
  return new Date().toISOString().split("T")[0];
}

export function ModalBaixa({ tipo, conta, onConfirmar, onCancelar }: Props) {
  const [dataPagamento, setDataPagamento] = useState(hoje());
  const [valorPago, setValorPago] = useState(conta.valor.toFixed(2));
  const [juros, setJuros] = useState("0");
  const [multa, setMulta] = useState("0");
  const [desconto, setDesconto] = useState("0");
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Recalcula valor pago automaticamente quando juros/multa/desconto mudam
  useEffect(() => {
    const base = conta.valor;
    const j = parseFloat(juros) || 0;
    const m = parseFloat(multa) || 0;
    const d = parseFloat(desconto) || 0;
    const calculado = Math.max(0, base + j + m - d);
    setValorPago(calculado.toFixed(2));
  }, [juros, multa, desconto, conta.valor]);

  const vp = parseFloat(valorPago) || 0;
  const vj = parseFloat(juros) || 0;
  const vm = parseFloat(multa) || 0;
  const vd = parseFloat(desconto) || 0;
  const valorEfetivo = conta.valor + vj + vm - vd;
  const diferenca = vp - valorEfetivo;

  // Alerta de vencimento
  const diffDias = Math.floor(
    (new Date(dataPagamento).getTime() - new Date(conta.dataVencimento).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const emAtraso = diffDias > 0;

  const handleConfirmar = async () => {
    setErro("");
    if (!dataPagamento) return setErro("Informe a data do pagamento");
    if (!formaPagamento) return setErro("Selecione a forma de pagamento");
    if (vp <= 0) return setErro("O valor pago deve ser maior que zero");

    setSalvando(true);
    try {
      await onConfirmar({
        dataPagamento,
        valorPago: vp,
        juros: vj,
        multa: vm,
        desconto: vd,
        formaPagamento,
        numeroDocumento,
        observacoes,
      });
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao registrar baixa");
    } finally {
      setSalvando(false);
    }
  };

  const labelPessoa = conta.fornecedor?.nome || conta.cliente?.nome;

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${
          tipo === "pagar" ? "bg-orange-50 border-b border-orange-100" : "bg-green-50 border-b border-green-100"
        }`}>
          <div>
            <h2 className="font-bold text-lg">
              {tipo === "pagar" ? "💸 Registrar Pagamento" : "💰 Registrar Recebimento"}
            </h2>
            <p className="text-sm text-muted-foreground truncate max-w-xs">{conta.descricao}</p>
            {labelPessoa && (
              <p className="text-xs text-muted-foreground">{labelPessoa}</p>
            )}
          </div>
          <button onClick={onCancelar} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Alerta de atraso */}
          {emAtraso && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Pagamento em atraso — {diffDias} dia{diffDias !== 1 ? "s" : ""} após o vencimento</span>
            </div>
          )}

          {/* Valor original */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm">
            <span className="text-muted-foreground">Valor original</span>
            <span className="font-semibold">{formatCurrency(conta.valor)}</span>
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data do pagamento *</Label>
              <Input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Forma de pagamento *</Label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Juros, Multa, Desconto */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-red-600">+ Juros (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={juros}
                onChange={(e) => setJuros(e.target.value)}
                className="h-9 text-sm"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-red-600">+ Multa (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={multa}
                onChange={(e) => setMulta(e.target.value)}
                className="h-9 text-sm"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-green-600">− Desconto (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                className="h-9 text-sm"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Valor pago (editável, mas calculado automaticamente) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Valor {tipo === "pagar" ? "pago" : "recebido"} (R$) *
            </Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
              className="h-9 text-sm font-semibold"
            />
            {Math.abs(diferenca) > 0.01 && (
              <p className={`text-xs ${diferenca > 0 ? "text-blue-600" : "text-orange-600"}`}>
                {diferenca > 0
                  ? `⬆ R$ ${diferenca.toFixed(2)} a mais que o calculado`
                  : `⬇ R$ ${Math.abs(diferenca).toFixed(2)} a menos que o calculado`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nº do documento</Label>
              <Input
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                placeholder="Comprovante, cheque..."
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observação</Label>
              <Input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Opcional"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Total calculado */}
          <div className={`rounded-lg border px-4 py-3 ${
            tipo === "pagar" ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"
          }`}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total efetivo</span>
              <span className="text-lg font-bold">{formatCurrency(vp)}</span>
            </div>
            {(vj > 0 || vm > 0 || vd > 0) && (
              <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                {vj > 0 && <div className="flex justify-between"><span>Juros</span><span className="text-red-600">+{formatCurrency(vj)}</span></div>}
                {vm > 0 && <div className="flex justify-between"><span>Multa</span><span className="text-red-600">+{formatCurrency(vm)}</span></div>}
                {vd > 0 && <div className="flex justify-between"><span>Desconto</span><span className="text-green-600">-{formatCurrency(vd)}</span></div>}
              </div>
            )}
          </div>

          {erro && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erro}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={salvando}
            className={tipo === "pagar" ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}
          >
            {salvando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Confirmar {tipo === "pagar" ? "Pagamento" : "Recebimento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
