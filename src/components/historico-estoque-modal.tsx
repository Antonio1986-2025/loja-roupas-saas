"use client";

import { useState, useEffect } from "react";
import { Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";

type Movimento = {
  id: string;
  tipo: string;
  quantidade: number;
  observacao: string | null;
  createdAt: string;
};

const TIPO_LABEL: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
  DEVOLUCAO: "Devolução",
};

const TIPO_COR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ENTRADA: "default",
  SAIDA: "destructive",
  AJUSTE: "secondary",
  DEVOLUCAO: "outline",
};

type Props = {
  varianteId: string;
  produtoNome: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function HistoricoEstoqueModal({
  varianteId,
  produtoNome,
  open,
  onOpenChange,
}: Props) {
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    fetch(`/api/estoque/${varianteId}/movimentos?page=${page}&limit=20`)
      .then((r) => r.ok && r.json())
      .then((json) => {
        if (json) {
          setMovimentos(json.data);
          setTotalPages(json.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [varianteId, page, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Movimentações</DialogTitle>
          <DialogDescription>{produtoNome}</DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : movimentos.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mb-2" />
            <p className="text-sm">Nenhuma movimentação registrada</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {movimentos.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant={TIPO_COR[m.tipo] || "outline"} className="w-20 justify-center">
                    {TIPO_LABEL[m.tipo] || m.tipo}
                  </Badge>
                  <div>
                    <span className={m.quantidade > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {m.quantidade > 0 ? "+" : ""}{m.quantidade}
                    </span>
                    {m.observacao && (
                      <p className="text-xs text-muted-foreground mt-0.5">{m.observacao}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="flex items-center text-xs text-muted-foreground">
              {page}/{totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
