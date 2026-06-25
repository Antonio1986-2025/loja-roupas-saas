"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function DeleteCategoriaButton({ categoriaId }: { categoriaId: string }) {
  const [open, setOpen] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [erro, setErro] = useState("");

  const handleDelete = async () => {
    setErro("");
    setDeletando(true);
    try {
      const res = await fetch(`/api/categorias/${categoriaId}`, { method: "DELETE" });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        setErro(err.message || "Erro ao excluir categoria");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setDeletando(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!deletando) { setOpen(v); setErro(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir categoria?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Se houver produtos vinculados, a exclusão será bloqueada.
            </DialogDescription>
          </DialogHeader>

          {erro && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deletando}>
              {erro ? "Fechar" : "Cancelar"}
            </Button>
            {!erro && (
              <Button variant="destructive" onClick={handleDelete} disabled={deletando}>
                {deletando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Excluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
