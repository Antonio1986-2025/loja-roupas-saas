"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, XCircle } from "lucide-react";

export function ImportClientesButton({ onSuccess }: { onSuccess?: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensagem, setMensagem] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aceita .xlsx e .xls
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setStatus("error");
      setMensagem("Envie um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    setStatus("loading");
    setMensagem("Importando clientes...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/clientes", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        const msg = `${data.criados} cliente(s) importado(s)` +
          (data.pulados > 0 ? ` · ${data.pulados} ignorado(s)` : "") +
          (data.erros > 0 ? ` · ${data.erros} erro(s)` : "");
        setMensagem(msg);
        setTimeout(() => {
          setStatus("idle");
          setMensagem("");
          onSuccess?.();
        }, 3000);
      } else {
        setStatus("error");
        setMensagem(data.error || "Erro ao importar");
      }
    } catch (err: unknown) {
      setStatus("error");
      setMensagem(err instanceof Error ? err.message : "Erro de conexão");
    }

    // Limpa o input para permitir reenvio do mesmo arquivo
    e.target.value = "";
  };

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <div className="relative">
        <Button variant="outline" size="sm" disabled={status === "loading"}>
          {status === "loading" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Importar Excel
        </Button>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          disabled={status === "loading"}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
        />
      </div>

      {status === "success" && (
        <span className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          {mensagem}
        </span>
      )}
      {status === "error" && (
        <span className="text-sm text-red-600 flex items-center gap-1">
          <XCircle className="h-4 w-4" />
          {mensagem}
        </span>
      )}
      {status === "idle" && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Formato: exportação do sistema Imports 67
        </span>
      )}
    </div>
  );
}
