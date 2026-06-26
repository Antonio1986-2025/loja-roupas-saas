"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type InfoPlano = {
  status: string;
  diasRestantesTrial: number | null;
  emTrial: boolean;
  bloqueado: boolean;
  precoMensal: number;
  whatsappSuporte: string;
};

export function TrialBanner() {
  const [info, setInfo] = useState<InfoPlano | null>(null);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    fetch("/api/plano")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setInfo(d))
      .catch(() => {});
  }, []);

  if (!info || fechado) return null;
  if (info.status !== "TRIAL_VENCENDO") return null;

  const dias = info.diasRestantesTrial ?? 0;
  const msg =
    dias === 1
      ? "Seu período gratuito vence amanhã!"
      : `Seu período gratuito vence em ${dias} dias.`;

  const link = `https://wa.me/${info.whatsappSuporte}?text=${encodeURIComponent(
    `Olá! Quero assinar o Stori por R$ ${info.precoMensal.toFixed(2).replace(".", ",")}/mês.`
  )}`;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>{msg}</strong> Continue usando o Stori por{" "}
          <strong>R$ {info.precoMensal.toFixed(2).replace(".", ",")}/mês</strong>.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-amber-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-amber-700 transition-colors"
        >
          Assinar agora
        </a>
        <button
          onClick={() => setFechado(true)}
          className="text-amber-600 hover:text-amber-800"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}