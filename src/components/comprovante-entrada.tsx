"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type ItemComprovante = {
  id: string;
  quantidade: number;
  precoUnitario: number | string;
  custoFinal: number | string | null;
  margemLucro: number | string | null;
  precoVendaSugerido: number | string | null;
  variante: {
    cor: string | null;
    tamanho: string | null;
    codigoBarras?: string | null;
    produto: { nome: string };
  };
};

type Props = {
  entrada: {
    numero: number;
    numeroNFe?: string | null;
    serieNFe?: number | null;
    dataEmissao?: Date | string | null;
    createdAt: Date | string;
    fornecedor?: { nome: string; cnpj?: string | null } | null;
    valorFrete?: number | string | null;
    valorSeguro?: number | string | null;
    valorDespesas?: number | string | null;
    valorDesconto?: number | string | null;
    valorICMS?: number | string | null;
    observacao?: string | null;
    itens: ItemComprovante[];
  };
  lojaNome?: string;
};

function formatarData(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : parseFloat(String(v)) || 0;
}

export function ComprovanteEntrada({ entrada, lojaNome = "Stori SaaS" }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const conteudo = printRef.current?.innerHTML;
    if (!conteudo) return;

    const janela = window.open("", "_blank", "width=900,height=700");
    if (!janela) return;

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Comprovante de Entrada #${entrada.numero}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #111;
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }
          .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #333; padding-bottom: 12px; }
          .header h1 { font-size: 18px; font-weight: bold; }
          .header p { font-size: 11px; color: #555; margin-top: 2px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .info-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px; }
          .info-box h3 { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #777; margin-bottom: 6px; }
          .info-box p { font-size: 12px; margin-bottom: 2px; }
          .info-box .label { color: #777; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          thead th {
            background: #f0f0f0;
            padding: 7px 8px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 2px solid #ccc;
          }
          tbody td { padding: 6px 8px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
          tbody tr:nth-child(even) td { background: #fafafa; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: monospace; }
          .totais { border: 1px solid #ddd; border-radius: 4px; padding: 12px; margin-bottom: 16px; }
          .totais h3 { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #777; margin-bottom: 8px; }
          .totais-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
          .totais-row.total { border-top: 2px solid #333; margin-top: 6px; padding-top: 8px; font-size: 14px; font-weight: bold; }
          .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
          .assinatura-linha { border-top: 1px solid #555; padding-top: 6px; text-align: center; font-size: 11px; color: #555; }
          .obs { background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; padding: 10px; font-size: 11px; color: #555; margin-bottom: 16px; }
          .badge-tipo { display: inline-block; background: #e7f3ff; color: #0066cc; border-radius: 3px; padding: 1px 6px; font-size: 10px; font-weight: bold; margin-left: 6px; }
          @media print {
            body { padding: 10px; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${conteudo}
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `);
    janela.document.close();
  };

  const totalUnidades = entrada.itens.reduce((s, i) => s + i.quantidade, 0);
  const totalProdutos = entrada.itens.reduce(
    (s, i) => s + toNum(i.precoUnitario) * i.quantidade,
    0
  );
  const totalFrete = toNum(entrada.valorFrete);
  const totalSeguro = toNum(entrada.valorSeguro);
  const totalDespesas = toNum(entrada.valorDespesas);
  const totalDesconto = toNum(entrada.valorDesconto);
  const totalICMS = toNum(entrada.valorICMS);
  const custoGeral = entrada.itens.reduce(
    (s, i) => s + toNum(i.custoFinal) * i.quantidade,
    0
  );

  return (
    <>
      {/* Botão visível na tela */}
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
        <Printer className="h-4 w-4" />
        Imprimir Comprovante
      </Button>

      {/* Conteúdo que será impresso — escondido na tela */}
      <div className="hidden">
        <div ref={printRef}>
          {/* Cabeçalho */}
          <div className="header">
            <h1>{lojaNome}</h1>
            <p>Comprovante de Conferência de Entrada de Mercadorias</p>
            <p style={{ marginTop: "4px", fontSize: "11px" }}>
              <strong>Entrada #{entrada.numero}</strong>
              {entrada.numeroNFe && (
                <> &nbsp;·&nbsp; NF-e {entrada.numeroNFe}
                  {entrada.serieNFe ? ` Série ${entrada.serieNFe}` : ""}
                </>
              )}
              &nbsp;·&nbsp; Emitido em {formatarData(new Date())}
            </p>
          </div>

          {/* Informações gerais */}
          <div className="info-grid">
            <div className="info-box">
              <h3>Fornecedor</h3>
              {entrada.fornecedor ? (
                <>
                  <p><strong>{entrada.fornecedor.nome}</strong></p>
                  {entrada.fornecedor.cnpj && (
                    <p><span className="label">CNPJ: </span>{entrada.fornecedor.cnpj}</p>
                  )}
                </>
              ) : (
                <p className="label">Não informado</p>
              )}
            </div>
            <div className="info-box">
              <h3>Dados da Entrada</h3>
              <p><span className="label">Data de Entrada: </span>{formatarData(entrada.createdAt)}</p>
              {entrada.dataEmissao && (
                <p><span className="label">Emissão NF: </span>{formatarData(entrada.dataEmissao)}</p>
              )}
              <p><span className="label">Total de itens: </span><strong>{totalUnidades} unidades</strong></p>
              <p><span className="label">Variações: </span>{entrada.itens.length}</p>
            </div>
          </div>

          {/* Tabela de itens */}
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>Cor</th>
                <th>Tamanho</th>
                <th className="text-center">Qtd</th>
                <th className="text-right">Preço Unit.</th>
                <th className="text-right">Custo Final</th>
                <th className="text-right">Total Custo</th>
                <th className="text-center">Margem</th>
                <th className="text-right">P. Venda Sug.</th>
              </tr>
            </thead>
            <tbody>
              {entrada.itens.map((item, idx) => (
                <tr key={item.id}>
                  <td className="text-center" style={{ color: "#999" }}>{idx + 1}</td>
                  <td>
                    <strong>{item.variante.produto.nome}</strong>
                    {item.variante.codigoBarras && (
                      <div className="font-mono" style={{ fontSize: "10px", color: "#999" }}>
                        {item.variante.codigoBarras}
                      </div>
                    )}
                  </td>
                  <td>{item.variante.cor || "—"}</td>
                  <td className="text-center">{item.variante.tamanho || "—"}</td>
                  <td className="text-center"><strong>{item.quantidade}</strong></td>
                  <td className="text-right font-mono">{formatCurrency(toNum(item.precoUnitario))}</td>
                  <td className="text-right font-mono">
                    {item.custoFinal ? formatCurrency(toNum(item.custoFinal)) : "—"}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: "bold" }}>
                    {item.custoFinal
                      ? formatCurrency(toNum(item.custoFinal) * item.quantidade)
                      : "—"}
                  </td>
                  <td className="text-center">
                    {item.margemLucro ? `${toNum(item.margemLucro).toFixed(0)}%` : "—"}
                  </td>
                  <td className="text-right font-mono">
                    {item.precoVendaSugerido
                      ? formatCurrency(toNum(item.precoVendaSugerido))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumo financeiro */}
          <div className="totais">
            <h3>Resumo Financeiro</h3>
            <div className="totais-row">
              <span>Valor dos produtos ({totalUnidades} un.)</span>
              <span className="font-mono">{formatCurrency(totalProdutos)}</span>
            </div>
            {totalFrete > 0 && (
              <div className="totais-row">
                <span>Frete</span>
                <span className="font-mono">{formatCurrency(totalFrete)}</span>
              </div>
            )}
            {totalSeguro > 0 && (
              <div className="totais-row">
                <span>Seguro</span>
                <span className="font-mono">{formatCurrency(totalSeguro)}</span>
              </div>
            )}
            {totalDespesas > 0 && (
              <div className="totais-row">
                <span>Outras Despesas</span>
                <span className="font-mono">{formatCurrency(totalDespesas)}</span>
              </div>
            )}
            {totalICMS > 0 && (
              <div className="totais-row">
                <span>ICMS / Impostos</span>
                <span className="font-mono">{formatCurrency(totalICMS)}</span>
              </div>
            )}
            {totalDesconto > 0 && (
              <div className="totais-row">
                <span>Desconto (–)</span>
                <span className="font-mono" style={{ color: "#e53e3e" }}>{formatCurrency(totalDesconto)}</span>
              </div>
            )}
            <div className="totais-row total">
              <span>Custo Total da Entrada</span>
              <span className="font-mono">{formatCurrency(custoGeral)}</span>
            </div>
          </div>

          {/* Observações */}
          {entrada.observacao && (
            <div className="obs">
              <strong>Observações: </strong>{entrada.observacao}
            </div>
          )}

          {/* Assinaturas */}
          <div className="assinaturas">
            <div>
              <div className="assinatura-linha">Responsável pelo Recebimento</div>
            </div>
            <div>
              <div className="assinatura-linha">Conferente / Estoquista</div>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "10px", color: "#aaa", marginTop: "20px" }}>
            Documento gerado automaticamente pelo sistema Stori SaaS em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
    </>
  );
}
