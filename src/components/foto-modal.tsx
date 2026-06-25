"use client";

import { ReactNode, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Props {
  src: string;
  alt: string;
  children: ReactNode;
}

export function FotoModal({ src, alt, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState(false);

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out">
          <div className="relative">
            {erro ? (
              <div className="w-80 h-80 flex items-center justify-center bg-muted rounded-lg text-muted-foreground">
                Imagem indisponível
              </div>
            ) : (
              <img
                src={src}
                alt={alt}
                className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
                onError={() => setErro(true)}
              />
            )}
            <Dialog.Close className="absolute -top-3 -right-3 rounded-full bg-background border shadow-sm p-1.5 hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
