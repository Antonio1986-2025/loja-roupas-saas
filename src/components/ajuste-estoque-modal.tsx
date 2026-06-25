"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const MOTIVOS = [
  "Ajuste manual",
  "Perda",
  "Quebra",
  "Furto",
  "Achado em estoque",
  "Contagem física",
  "Outro",
];

type Props = {
  varianteId: string;
  produtoNome: string;
  cor?: string | null;
  tamanho?: string | null;
  qtdAtual: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
};

export function AjusteEstoqueModal({
  varianteId,
  produtoNome,
  cor,
  tamanho,
  qtdAtual,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [quantidade, setQuantidade] = useState(String(qtdAtual));
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    try {
      const res = await fetch(`/api/estoque/${varianteId}/ajustar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantidade: Number(quantidade),
          motivo,
          observacao: observacao || undefined,
        }),
      });

      if (res.ok) {
        onOpenChange(false);
        onSuccess();
      } else {
        const err = await res.json();
        setErro(err.message || "Erro ao ajustar estoque");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const diferenca = Number(quantidade) - qtdAtual;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Estoque</DialogTitle>
          <DialogDescription>
            {produtoNome}
            {cor && ` — ${cor}`}
            {tamanho && ` / ${tamanho}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Estoque atual: <strong>{qtdAtual}</strong> unidades
            {diferenca !== 0 && (
              <span className={diferenca > 0 ? "text-green-600" : "text-red-600"}>
                {" → "}
                <strong>{Number(quantidade)}</strong> ({diferenca > 0 ? "+" : ""}{diferenca})
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qtd">Nova quantidade *</Label>
            <Input
              id="qtd"
              type="number"
              min="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <select
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observação</Label>
            <Input
              id="obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observação opcional..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
