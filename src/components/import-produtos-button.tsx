"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, XCircle } from "lucide-react";

export function ImportProdutosButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [mensagem, setMensagem] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("loading");
    setMensagem("Importando...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        const pulados = data.produtosPulados > 0 ? ` (${data.produtosPulados} duplicatas ignoradas)` : "";
        setMensagem(
          `${data.produtosCriados} produtos importados! (${data.variantesCriadas} variantes, ${data.estoqueTotal} itens)${pulados}`
        );
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setStatus("error");
        setMensagem(data.error || "Erro ao importar");
      }
    } catch (err: any) {
      setStatus("error");
      setMensagem(`Erro: ${err.message || "conexao"}`);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative">
        <Button variant="outline" disabled={status === "loading"}>
          {status === "loading" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Importar CSV
        </Button>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          disabled={status === "loading"}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
          }}
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
    </div>
  );
}
