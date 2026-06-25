"use client";

import { useState } from "react";
import { Package } from "lucide-react";

interface Props {
  src: string;
  alt: string;
}

export function ProdutoImage({ src, alt }: Props) {
  const [erro, setErro] = useState(false);

  if (erro) {
    return (
      <div className="flex items-center justify-center h-full">
        <Package className="h-16 w-16 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="object-cover w-full h-full"
      loading="lazy"
      onError={() => setErro(true)}
    />
  );
}
