"use client";

import { ReactNode, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ZoomIn } from "lucide-react";
import { fotoUrl } from "@/lib/google-drive";

interface Props {
  src: string;
  alt: string;
  children: ReactNode;
}

export function FotoModal({ src, alt, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState(false);

  // Sempre usar versao full (800px) no modal — independente do tamanho que veio
  const srcFull = fotoUrl(src, "full") ?? src;

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 focus:outline-none">
          <div className="relative">
            {erro ? (
              <div className="w-80 h-80 flex flex-col items-center justify-center bg-muted rounded-xl text-muted-foreground gap-2">
                <ZoomIn className="h-10 w-10 opacity-30" />
                <span className="text-sm">Imagem indisponível</span>
              </div>
            ) : (
              <img
                src={srcFull}
                alt={alt}
                className="max-w-[92vw] max-h-[88vh] rounded-xl shadow-2xl object-contain"
                onError={() => setErro(true)}
              />
            )}
            {/* Botao fechar */}
            <Dialog.Close className="absolute -top-3 -right-3 rounded-full bg-background border shadow-md p-1.5 hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
            {/* Nome do produto na parte inferior */}
            {!erro && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl p-3">
                <p className="text-white text-sm font-medium text-center truncate">{alt}</p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}