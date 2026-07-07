"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { fotoUrl, type TamanhoFoto } from "@/lib/google-drive";

interface Props {
  src: string;
  alt: string;
  /** "thumb" = 200px (listas/cards), "medium" = 400px, "full" = 800px (detalhe). Padrao: "thumb" */
  tamanho?: TamanhoFoto;
  className?: string;
}

export function ProdutoImage({ src, alt, tamanho = "thumb", className }: Props) {
  const [erro, setErro] = useState(false);
  const url = fotoUrl(src, tamanho);

  if (erro || !url) {
    return (
      <div className={`flex items-center justify-center h-full ${className ?? ""}`}>
        <Package className="h-16 w-16 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`object-cover w-full h-full ${className ?? ""}`}
      loading="lazy"
      onError={() => setErro(true)}
    />
  );
}