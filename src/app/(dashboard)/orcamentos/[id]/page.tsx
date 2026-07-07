"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  ShoppingCart,
  X,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { differenceInDays } from "date-fns";

const statusConfig: Record<string, { label: string; cls: string }> = {
  ABERTO: { label: "Aberto", cls: "bg-blue-500" },
  CONVERTIDO: { label: "Convertido", cls: "bg-green-500" },
  CANCELADO: { label: "Cancelado", cls: "bg-gray-400" },
  EXPIRADO: { label: "Expirado", cls: "bg-red-500" },
};

const formaLabels: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  PIX: "PIX",
  BOLETO: "Boleto",
  CREDITO_LOJA: "Crédito Loja",
  DUPLICATA: "Duplicata",
};

export default function DetalheOrcamentoPage() {
  const router = useRouter();
  const params = useParams();
  const [orcamento, setOrcamento] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [convertendo, setConvertendo] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [confirmCancelar, setConfirmCancelar] = useState(false);

  const carregarOrcamento = () => {
    setCarregando(true);
    fetch(`/api/orcamentos/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setOrcamento(d);
        setCarregando(false);
      })
      .catch(() => {
        router.push("/orcamentos");
      });
  };

  useEffect(() => {
    carregarOrcamento();
  }, [params.id]);

  const handleConverter = async () => {
    setErro("");
    setConvertendo(true);
    try {
      const res = await fetch(`/api/orcamentos/${params.id}/converter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setSucesso(`Venda gerada com sucesso!`);
        setTimeout(() => {
          router.push(`/vendas/${data.vendaId}`);
        }, 1000);
      } else {
        const err = await res.json();
        setErro(err.message || err.error || "Erro ao converter orçamento");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setConvertendo(false);
    }
  };

  const handleCancelar = async () => {
    setErro("");
    setCancelando(true);
    try {
      const res = await fetch(`/api/orcamentos/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSucesso("Orçamento cancelado.");
        carregarOrcamento();
      } else {
        const err = await res.json();
        setErro(err.message || err.error || "Erro ao cancelar orçamento");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCancelando(false);
      setConfirmCancelar(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Orçamento não encontrado
      </div>
    );
  }

  const cfg = statusConfig[orcamento.status] ?? { label: orcamento.status, cls: "bg-gray-400" };
  const agora = new Date();
  const dataValidade = new Date(orcamento.dataValidade);
  const diasRestantes = differenceInDays(dataValidade, agora);
  const isAberto = orcamento.status === "ABERTO";
  const isExpired = isAberto && dataValidade < agora;
  const expiringWarning = isAberto && diasRestantes <= 2 && diasRestantes >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orcamentos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Orçamento #{orcamento.numero}</h1>
          <p className="text-muted-foreground">{formatDateTime(orcamento.createdAt)}</p>
        </div>
        <Badge className={`${cfg.cls} text-white text-sm px-3 py-1`}>{cfg.label}</Badge>

        {/* Action buttons */}
        {isAberto && !isExpired && (
          <Button
            onClick={handleConverter}
            disabled={convertendo}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {convertendo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            Gerar Venda
          </Button>
        )}

        {isAberto && !confirmCancelar && (
          <Button
            variant="outline"
            className="border-red-400 text-red-600 hover:bg-red-50"
            onClick={() => setConfirmCancelar(true)}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar Orçamento
          </Button>
        )}

        {confirmCancelar && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Confirmar cancelamento?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelar}
              disabled={cancelando}
            >
              {cancelando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, cancelar"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmCancelar(false)}>
              Não
            </Button>
          </div>
        )}
      </div>

      {/* Expiry warning banner */}
      {isExpired && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Orçamento expirado</p>
            <p className="mt-1">
              A validade era {formatDate(orcamento.dataValidade)}. Este orçamento não pode mais
              ser convertido em venda.
            </p>
          </div>
        </div>
      )}

      {expiringWarning && (
        <div className="flex items-start gap-3 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {diasRestantes === 0
                ? "Este orçamento vence hoje!"
                : `Este orçamento vence em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}!`}
            </p>
            <p className="mt-1">Converta em venda antes de {formatDate(orcamento.dataValidade)}.</p>
          </div>
        </div>
      )}

      {/* Link to generated venda */}
      {orcamento.status === "CONVERTIDO" && orcamento.vendaGerada && (
        <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Orçamento convertido em venda!</p>
            <p className="mt-1">
              Venda #{orcamento.vendaGerada.numero} gerada com sucesso.
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-green-500 text-green-700" asChild>
            <Link href={`/vendas/${orcamento.vendaGerada.id}`}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Ver Venda
            </Link>
          </Button>
        </div>
      )}

      {/* Feedback messages */}
      {sucesso && (
        <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {sucesso}
        </div>
      )}

      {erro && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {erro}
        </div>
      )}

      {/* Info grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{orcamento.cliente?.nome || "Não informado"}</span>
            </div>
            {orcamento.cliente?.telefone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span>{orcamento.cliente.telefone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendedor</span>
              <span className="font-medium">{orcamento.vendedor?.name}</span>
            </div>
            {orcamento.formaPagamento && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forma de Pagamento</span>
                <span>{formaLabels[orcamento.formaPagamento] || orcamento.formaPagamento}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validade</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDate(orcamento.dataValidade)}
                {isAberto && !isExpired && (
                  <span
                    className={`ml-1 text-xs ${
                      expiringWarning ? "text-orange-600 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    ({diasRestantes === 0
                      ? "hoje"
                      : diasRestantes < 0
                      ? "expirado"
                      : `${diasRestantes} dias`})
                  </span>
                )}
              </span>
            </div>
            {orcamento.observacoes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Observações</span>
                <span className="text-right max-w-[200px]">{orcamento.observacoes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(orcamento.subtotal))}</span>
            </div>
            {Number(orcamento.desconto) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto</span>
                <span>-{formatCurrency(Number(orcamento.desconto))}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(Number(orcamento.total))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Itens ({orcamento.itens?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Produto</th>
                  <th className="text-center py-2 font-medium">Qtd</th>
                  <th className="text-right py-2 font-medium">Preço Unit.</th>
                  <th className="text-right py-2 font-medium">Desc. Item</th>
                  <th className="text-right py-2 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orcamento.itens?.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3">
                      <span className="font-medium">{item.variante?.produto?.nome}</span>
                      {(item.variante?.cor || item.variante?.tamanho) && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          (
                          {[
                            item.variante?.produto?.marca,
                            item.variante?.cor,
                            item.variante?.tamanho,
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                          )
                        </span>
                      )}
                    </td>
                    <td className="text-center py-3">{item.quantidade}</td>
                    <td className="text-right py-3">{formatCurrency(Number(item.precoUnit))}</td>
                    <td className="text-right py-3">
                      {Number(item.desconto) > 0
                        ? `-${formatCurrency(Number(item.desconto))}`
                        : "—"}
                    </td>
                    <td className="text-right py-3 font-medium">
                      {formatCurrency(Number(item.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="grid gap-2 md:hidden">
            {orcamento.itens?.map((item: any) => (
              <div key={item.id} className="border rounded-lg p-3 text-sm">
                <p className="font-medium">{item.variante?.produto?.nome}</p>
                {(item.variante?.cor || item.variante?.tamanho) && (
                  <p className="text-xs text-muted-foreground">
                    {[item.variante?.produto?.marca, item.variante?.cor, item.variante?.tamanho]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                )}
                <div className="flex justify-between mt-1 text-xs">
                  <span>
                    Qtd: <strong>{item.quantidade}</strong>
                  </span>
                  <span>
                    Unit: <strong>{formatCurrency(Number(item.precoUnit))}</strong>
                  </span>
                  {Number(item.desconto) > 0 && (
                    <span className="text-destructive">
                      Desc: -{formatCurrency(Number(item.desconto))}
                    </span>
                  )}
                  <span className="font-semibold">
                    {formatCurrency(Number(item.subtotal))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
