"use client";

import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "@/lib/utils";

export type EtiquetaItem = {
  id: string;
  codigoBarras: string | null;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  preco: number;
  codigoInterno: string | null;
};

function truncar(s: string, n: number) {
  return s.length > n ? s.substring(0, n) + "\u2026" : s;
}

export function Etiqueta({ item, nomeLoja = "STORI" }: { item: EtiquetaItem; nomeLoja?: string }) {
  const qrValue = item.codigoBarras || item.codigoInterno || item.id;
  const variante = [item.cor, item.tamanho].filter(Boolean).join(" / ") || "\u2014";

  return (
    <div className="etiqueta-item">
      <div className="etiqueta-header">
        <span className="etiqueta-loja">{nomeLoja}</span>
        <span className="etiqueta-nome">{truncar(item.nome.toUpperCase(), 22)}</span>
      </div>
      <div className="etiqueta-body">
        <div className="etiqueta-qr">
          <QRCodeSVG value={qrValue} size={52} level="M" includeMargin={false} />
        </div>
        <div className="etiqueta-dados">
          <span className="etiqueta-variante">{variante}</span>
          <span className="etiqueta-preco">{formatCurrency(item.preco)}</span>
          <span className="etiqueta-ref">REF: {item.codigoInterno || qrValue}</span>
        </div>
      </div>
    </div>
  );
}