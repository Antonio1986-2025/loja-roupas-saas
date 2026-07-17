"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type DanfeItem = {
  codigo: string;
  nome: string;
  ncm?: string;
  cfop?: string;
  csosn?: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

type Props = {
  nota: {
    tipo: string;
    modelo: string;
    serie: number;
    numero: number;
    chaveAcesso?: string;
    nProt?: string;
    dataEmissao: string;
    naturezaOperacao?: string;
    ambiente?: number;

    emitenteNome: string;
    emitenteCnpj: string;
    emitenteIE?: string;
    emitenteEndereco?: string;
    emitenteCidade?: string;
    emitenteEstado?: string;

    clienteNome?: string;
    clienteCpfCnpj?: string;
    clienteEndereco?: string;
    clienteCidade?: string;
    clienteEstado?: string;

    itens: DanfeItem[];
    valorProdutos: number;
    valorDesconto?: number;
    valorFrete?: number;
    valorTotal: number;
    observacao?: string;
  };
};

function formatCpfCnpj(valor?: string): string {
  if (!valor) return "—";
  const limpo = valor.replace(/\D/g, "");
  if (limpo.length <= 11) return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatChave(chave?: string): string {
  if (!chave) return "—";
  return chave.replace(/(\d{4})/g, "$1 ").trim();
}

export function Danfe({ nota }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const conteudo = printRef.current?.innerHTML;
    if (!conteudo) return;
    const janela = window.open("", "_blank", "width=900,height=700");
    if (!janela) return;
    janela.document.write(`
      <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>DANFE #${nota.numero}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 900px; margin: 0 auto; }
        .header { text-align: center; border: 2px solid #000; padding: 12px; margin-bottom: 8px; }
        .header h1 { font-size: 16px; margin-bottom: 4px; }
        .header .chave { font-size: 10px; letter-spacing: 1px; }
        .row { display: flex; gap: 8px; margin-bottom: 8px; }
        .box { border: 1px solid #000; padding: 8px; flex: 1; }
        .box h3 { font-size: 11px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table th { background: #eee; border: 1px solid #000; padding: 4px 6px; font-size: 10px; text-align: left; }
        table td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row td { font-weight: bold; font-size: 13px; }
        .footer { text-align: center; font-size: 10px; margin-top: 24px; color: #666; }
        .homolog { text-align: center; color: red; font-weight: bold; font-size: 20px; margin-bottom: 8px; }
        @media print { body { padding: 10px; } button { display: none !important; } }
      </style></head><body>${conteudo}
      <script>window.onload = () => window.print();</script></body></html>`);
    janela.document.close();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
        <Printer className="h-4 w-4" /> Imprimir DANFE
      </Button>

      <div className="hidden">
        <div ref={printRef}>
          {nota.ambiente === 2 && (
            <div className="homolog">SEM VALOR FISCAL — HOMOLOGAÇÃO</div>
          )}

          <div className="header">
            <h1>DANFE — Documento Auxiliar da Nota Fiscal Eletrônica</h1>
            <p>{nota.tipo === "NFCE" ? "NFC-e" : "NF-e"} — Modelo {nota.modelo} — Nº {nota.serie}.{String(nota.numero).padStart(6, "0")}</p>
            <p className="chave">Chave de Acesso: {formatChave(nota.chaveAcesso)}</p>
            {nota.nProt && <p className="chave">Protocolo de Autorização: {nota.nProt} — {new Date(nota.dataEmissao).toLocaleDateString("pt-BR")}</p>}
          </div>

          <div className="row">
            <div className="box">
              <h3>Emitente</h3>
              <p><strong>{nota.emitenteNome}</strong></p>
              <p>CNPJ: {formatCpfCnpj(nota.emitenteCnpj)}</p>
              {nota.emitenteIE && <p>IE: {nota.emitenteIE}</p>}
              {nota.emitenteEndereco && <p>{nota.emitenteEndereco} — {nota.emitenteCidade}/{nota.emitenteEstado}</p>}
            </div>
            <div className="box">
              <h3>Destinatário</h3>
              <p><strong>{nota.clienteNome || "CONSUMIDOR FINAL"}</strong></p>
              <p>{formatCpfCnpj(nota.clienteCpfCnpj)}</p>
              {nota.clienteEndereco && <p>{nota.clienteEndereco} — {nota.clienteCidade}/{nota.clienteEstado}</p>}
            </div>
          </div>

          <div className="row">
            <div className="box">
              <h3>Natureza da Operação</h3>
              <p>{nota.naturezaOperacao || "Venda de mercadoria"}</p>
            </div>
            <div className="box">
              <h3>Data de Emissão</h3>
              <p>{new Date(nota.dataEmissao).toLocaleString("pt-BR")}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>NCM</th>
                <th>CFOP</th>
                <th className="text-right">Qtd</th>
                <th className="text-right">V.Unit</th>
                <th className="text-right">V.Total</th>
              </tr>
            </thead>
            <tbody>
              {nota.itens.map((item, i) => (
                <tr key={i}>
                  <td className="text-center">{i + 1}</td>
                  <td>{item.nome}</td>
                  <td className="text-center">{item.ncm || "—"}</td>
                  <td className="text-center">{item.cfop || "—"}</td>
                  <td className="text-right">{item.quantidade}</td>
                  <td className="text-right">{formatCurrency(item.precoUnitario)}</td>
                  <td className="text-right">{formatCurrency(item.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row">
            <div className="box">
              <h3>Totais</h3>
              <p>Produtos: {formatCurrency(nota.valorProdutos)}</p>
              {nota.valorDesconto ? <p>Desconto: {formatCurrency(nota.valorDesconto)}</p> : null}
              {nota.valorFrete ? <p>Frete: {formatCurrency(nota.valorFrete)}</p> : null}
              <p><strong>Total: {formatCurrency(nota.valorTotal)}</strong></p>
            </div>
            <div className="box">
              <h3>Informações Complementares</h3>
              <p>{nota.observacao || "—"}</p>
            </div>
          </div>

          <div className="footer">
            DANFE gerado automaticamente pelo Stori SaaS — {new Date().toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
    </>
  );
}
