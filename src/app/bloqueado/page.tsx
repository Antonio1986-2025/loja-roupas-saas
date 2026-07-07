"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, MessageCircle, LogOut } from "lucide-react";

type InfoPlano = {
  status: string;
  precoMensal: number;
  whatsappSuporte: string;
};

export default function BloqueadoPage() {
  const [info, setInfo] = useState<InfoPlano | null>(null);

  useEffect(() => {
    fetch("/api/plano")
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => {});
  }, []);

  const motivo =
    info?.status === "SUSPENSO"
      ? "Sua conta foi suspensa."
      : info?.status === "CANCELADO"
      ? "Sua conta foi cancelada."
      : "Seu período de teste gratuito encerrou.";

  const whatsapp = info?.whatsappSuporte ?? "5511999999999";
  const preco = info?.precoMensal ?? 149.99;
  const linkWhats = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    `Olá! Quero reativar minha conta no Stori. Plano: R$ ${preco.toFixed(2).replace(".", ",")}/mês.`
  )}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-slate-500" />
          </div>
          <CardTitle className="text-2xl">Acesso bloqueado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{motivo}</p>
          <div className="bg-slate-50 rounded-lg p-4 border">
            <p className="text-2xl font-bold text-primary">
              R$ {preco.toFixed(2).replace(".", ",")}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 text-left list-inside list-disc">
              <li>Produtos e usuários ilimitados</li>
              <li>PDV, estoque e condicionais</li>
              <li>Importação de produtos</li>
              <li>Suporte incluso</li>
            </ul>
          </div>
          <a href={linkWhats} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full gap-2">
              <MessageCircle className="h-4 w-4" />
              Assinar via WhatsApp
            </Button>
          </a>
          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}