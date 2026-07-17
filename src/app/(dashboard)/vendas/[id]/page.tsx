"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Loader2, RotateCcw, CheckCircle2, FileText } from "lucide-react";
import Link from "next/link";
import ModalDevolucao from "@/components/modal-devolucao";
import ModalEmitirNFe from "@/components/modal-emitir-nfe";

const formaPagamentoLabels: Record<string, string> = {
  DINHEIRO: "Dinheiro", DEBITO: "Débito", CREDITO: "Crédito", PIX: "PIX", BOLETO: "Boleto", DUPLICATA: "Duplicata", CREDITO_LOJA: "Crédito Loja",
};

const statusColors: Record<string, string> = {
  CONCLUIDA: "bg-green-500", CANCELADA: "bg-red-500", DEVOLVIDA: "bg-yellow-500",
};

const statusLabels: Record<string, string> = {
  CONCLUIDA: "Concluída", CANCELADA: "Cancelada", DEVOLVIDA: "Devolvida",
  PENDENTE: "Pendente", PAGO: "Pago", CANCELADO: "Cancelado",
};

export default function DetalheVendaPage() {
  const router = useRouter();
  const params = useParams();
  const [venda, setVenda] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [showDevolucao, setShowDevolucao] = useState(false);
  const [devolvendo, setDevolvendo] = useState(false);
  const [erroDevolucao, setErroDevolucao] = useState("");
  const [devolucaoSucesso, setDevolucaoSucesso] = useState(false);

  const carregarVenda = () => {
    setCarregando(true);
    fetch(`/api/vendas/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setVenda(d); setCarregando(false); })
      .catch(() => { router.push("/vendas"); });
  };

  useEffect(() => {
    carregarVenda();
  }, [params.id, router]);

  // NF-e
  const [showEmitirNFe, setShowEmitirNFe] = useState(false);

  const handleNFeEmitida = (dados: any) => {
    // atualiza a venda após emissão
    carregarVenda();
  };

  const handleDevolver = async (data: {
    itens: { vendaItemId: string; quantidade: number }[];
    tipoEstorno: "DINHEIRO" | "CREDITO_LOJA";
    motivo?: string;
  }) => {
    setDevolvendo(true);
    setErroDevolucao("");
    try {
      const res = await fetch(`/api/vendas/${params.id}/devolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Erro ao processar devolução");
      }
      setShowDevolucao(false);
      setDevolucaoSucesso(true);
      carregarVenda();
    } catch (e: any) {
      setErroDevolucao(e.message);
    } finally {
      setDevolvendo(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Venda não encontrada
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/vendas"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Venda #{venda.numero}</h1>
          <p className="text-muted-foreground">{formatDateTime(venda.createdAt)}</p>
        </div>
        <Badge className={`${statusColors[venda.status] || "bg-gray-500"} text-white`}>
          {statusLabels[venda.status] || venda.status}
        </Badge>
        {(venda.status === "CONCLUIDA" || venda.status === "DEVOLVIDA_PARCIAL") && (
          <><Button
            onClick={() => {
              setErroDevolucao("");
              setShowDevolucao(true);
            }}
            variant="outline"
            className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Devolver
          </Button>
          <Button
            onClick={() => setShowEmitirNFe(true)}
            variant="outline"
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <FileText className="mr-2 h-4 w-4" />
            Emitir NF-e
          </Button></>
        )}
      </div>

      {devolucaoSucesso && (
        <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Devolução processada com sucesso!</p>
            <p className="mt-1">O estoque foi atualizado e o estorno registrado.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-green-700"
            onClick={() => setDevolucaoSucesso(false)}
          >
            Fechar
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{venda.cliente?.nome || "Consumidor final"}</span>
            </div>
            {venda.cliente?.telefone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span>{venda.cliente.telefone}</span>
              </div>
            )}
            {venda.cliente?.cpf && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPF</span>
                <span>{venda.cliente.cpf}</span>
              </div>
            )}
            {Number(venda.cliente?.creditoAtual) > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span>Crédito disponível</span>
                <span className="font-semibold">{formatCurrency(Number(venda.cliente.creditoAtual))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendedor</span>
              <span className="font-medium">{venda.vendedor?.name}</span>
            </div>
            {venda.observacoes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Observações</span>
                <span className="text-right max-w-[200px]">{venda.observacoes}</span>
              </div>
            )}
            {venda.formaPagamento === "DUPLICATA" && venda.qtdParcelas && venda.qtdParcelas > 1 && (
              <div className="flex justify-between text-blue-600">
                <span>Parcelamento</span>
                <span className="font-semibold">{venda.qtdParcelas}x de {formatCurrency(Number(venda.total) / venda.qtdParcelas)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Valores</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(venda.subtotal))}</span>
            </div>
            {Number(venda.desconto) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto</span>
                <span>-{formatCurrency(Number(venda.desconto))}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(Number(venda.total))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pagamentos</CardTitle></CardHeader>
        <CardContent>
          {venda.pagamentos?.length > 0 ? (
            <div className="space-y-2">
              {venda.pagamentos.map((p: any, i: number) => (
                <div key={p.id || i} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="font-medium">{formaPagamentoLabels[p.formaPagamento] || p.formaPagamento}</span>
                  <span className="font-semibold">{formatCurrency(Number(p.valor))}</span>
                </div>
              ))}
              {venda.contasReceber?.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Contas a Receber</p>
                  <div className="space-y-2">
                    {venda.contasReceber.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <div>
                          <span className="font-medium">{formaPagamentoLabels[c.formaPagamento] || c.formaPagamento}</span>
                          <Badge className={`ml-2 ${c.status === "PAGO" ? "bg-green-500" : c.status === "CANCELADO" ? "bg-gray-500" : "bg-yellow-500"} text-white`}>
                            {statusLabels[c.status] || c.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(Number(c.valor))}</p>
                          <p className="text-xs text-muted-foreground">Vence {formatDateTime(c.dataVencimento)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {formaPagamentoLabels[venda.formaPagamento] || venda.formaPagamento}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Itens ({venda.itens?.length || 0})</span>
            {venda.itens?.some((i: any) => (i.qtdDevolvida || 0) > 0) && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                {venda.itens.filter((i: any) => (i.qtdDevolvida || 0) > 0).length} itens com devolução
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Produto</th>
                  <th className="text-center py-2 font-medium">Qtd</th>
                  <th className="text-center py-2 font-medium">Devolvido</th>
                  <th className="text-right py-2 font-medium">Preço Unit.</th>
                  <th className="text-right py-2 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {venda.itens?.map((item: any) => {
                  const devolvido = item.qtdDevolvida || 0;
                  const pendente = item.quantidade - devolvido;
                  return (
                    <tr key={item.id} className={`border-b last:border-0 ${devolvido > 0 ? "bg-yellow-50/50" : ""}`}>
                      <td className="py-3">
                        <span className="font-medium">{item.variante?.produto?.nome}</span>
                        {(item.variante?.cor || item.variante?.tamanho) && (
                          <span className="text-muted-foreground ml-1">
                            ({[item.variante.cor, item.variante.tamanho].filter(Boolean).join(" / ")})
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3">{item.quantidade}</td>
                      <td className="text-center py-3">
                        {devolvido > 0 ? (
                          <Badge className="bg-yellow-500 text-white text-xs">
                            {devolvido}/{item.quantidade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-right py-3">{formatCurrency(Number(item.precoUnit))}</td>
                      <td className="text-right py-3 font-medium">{formatCurrency(Number(item.subtotal))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 md:hidden">
            {venda.itens?.map((item: any) => {
              const devolvido = item.qtdDevolvida || 0;
              return (
                <div key={item.id} className={`border rounded-lg p-3 text-sm ${devolvido > 0 ? "bg-yellow-50/50 border-yellow-300" : ""}`}>
                  <p className="font-medium">{item.variante?.produto?.nome}</p>
                  {(item.variante?.cor || item.variante?.tamanho) && (
                    <p className="text-xs text-muted-foreground">
                      {[item.variante.cor, item.variante.tamanho].filter(Boolean).join(" / ")}
                    </p>
                  )}
                  <div className="flex justify-between mt-1 text-xs">
                    <span>Qtd: <strong>{item.quantidade}</strong></span>
                    {devolvido > 0 && (
                      <span className="text-yellow-600">
                        Devolvido: <strong>{devolvido}</strong>
                      </span>
                    )}
                    <span>Unit: <strong>{formatCurrency(Number(item.precoUnit))}</strong></span>
                    <span className="font-medium">{formatCurrency(Number(item.subtotal))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showDevolucao && (
        <ModalDevolucao
          itens={venda.itens}
          vendaNumero={venda.numero}
          clienteNome={venda.cliente?.nome}
          onConfirm={handleDevolver}
          onCancel={() => setShowDevolucao(false)}
          carregando={devolvendo}
          erro={erroDevolucao}
        />
      )}

      {showEmitirNFe && (
        <ModalEmitirNFe
          vendaId={venda.id}
          vendaNumero={venda.numero}
          vendaTotal={Number(venda.total)}
          clienteNome={venda.cliente?.nome}
          clienteCpf={venda.cliente?.cpf}
          onClose={() => setShowEmitirNFe(false)}
          onSuccess={handleNFeEmitida}
        />
      )}
    </div>
  );
}
