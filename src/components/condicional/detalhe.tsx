"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

type Item = {
  id: string;
  nome: string;
  cor: string | null;
  tamanho: string | null;
  quantidade: number;
  precoUnit: number;
  subtotal: number;
  statusFinal: "COMPRADO" | "DEVOLVIDO" | null;
};

type Condicional = {
  id: string;
  numero: number;
  status: "ATIVA" | "FINALIZADA" | "CANCELADA";
  prazoDias: number;
  dataSaida: string;
  dataVencimento: string;
  dataFinalizacao: string | null;
  dataCancelamento: string | null;
  observacoes: string | null;
  cliente: { nome: string; telefone: string | null } | null;
  vendaGerada: { id: string; numero: number; total: number } | null;
  itens: Item[];
};

const FORMAS = [
  { v: "DINHEIRO", l: "Dinheiro" },
  { v: "PIX", l: "PIX" },
  { v: "DEBITO", l: "Débito" },
  { v: "CREDITO", l: "Crédito" },
  { v: "BOLETO", l: "Boleto" },
  { v: "DUPLICATA", l: "Duplicata" },
];

export function CondicionalDetalhe({ condicional }: { condicional: Condicional }) {
  const router = useRouter();
  const [finalizando, setFinalizando] = useState(false);
  const [classif, setClassif] = useState<Record<string, "COMPRADO" | "DEVOLVIDO">>({});
  const [formaPagamento, setFormaPagamento] = useState("DINHEIRO");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const vencida =
    condicional.status === "ATIVA" && new Date(condicional.dataVencimento) < new Date();
  const total = condicional.itens.reduce((s, i) => s + i.subtotal, 0);
  const totalComprado = condicional.itens
    .filter((i) => classif[i.id] === "COMPRADO")
    .reduce((s, i) => s + i.subtotal, 0);
  const todosClassificados = condicional.itens.every((i) => classif[i.id]);
  const temCompra = condicional.itens.some((i) => classif[i.id] === "COMPRADO");

  const finalizar = async () => {
    setErro("");
    if (!todosClassificados) {
      setErro("Classifique todos os itens como comprado ou devolvido");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/condicionais/${condicional.id}/finalizar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itens: condicional.itens.map((i) => ({ itemId: i.id, status: classif[i.id] })),
        formaPagamento: temCompra ? formaPagamento : undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
      setFinalizando(false);
    } else {
      const err = await res.json();
      setErro(err.message || "Erro ao finalizar");
    }
  };

  const cancelar = async () => {
    if (!confirm("Cancelar esta condicional? Os produtos voltarão ao estoque.")) return;
    setLoading(true);
    const res = await fetch(`/api/condicionais/${condicional.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) router.refresh();
    else setErro("Erro ao cancelar");
  };

  const statusBadge = vencida ? (
    <Badge className="bg-red-500">Vencida</Badge>
  ) : condicional.status === "ATIVA" ? (
    <Badge className="bg-blue-500">Ativa</Badge>
  ) : condicional.status === "FINALIZADA" ? (
    <Badge className="bg-green-500">Finalizada</Badge>
  ) : (
    <Badge className="bg-gray-400">Cancelada</Badge>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/condicionais">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Condicional #{condicional.numero}</h1>
            {statusBadge}
          </div>
          <p className="text-muted-foreground">{condicional.cliente?.nome || "Cliente removido"}</p>
        </div>
        {condicional.status === "ATIVA" && !finalizando && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelar} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={() => setFinalizando(true)}>Finalizar</Button>
          </div>
        )}
      </div>

      {vencida && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4" />
          Prazo de devolução vencido em {formatDate(condicional.dataVencimento)}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="Cliente" value={condicional.cliente?.nome || "—"} />
            <Info label="Telefone" value={condicional.cliente?.telefone || "—"} />
            <Info label="Data de saída" value={formatDate(condicional.dataSaida)} />
            <Info label="Vencimento" value={formatDate(condicional.dataVencimento)} />
            <Info label="Prazo" value={`${condicional.prazoDias} dias`} />
            {condicional.dataFinalizacao && (
              <Info label="Finalizada em" value={formatDate(condicional.dataFinalizacao)} />
            )}
            {condicional.observacoes && (
              <Info label="Observações" value={condicional.observacoes} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="Total de itens" value={String(condicional.itens.length)} />
            <Info label="Valor total" value={formatCurrency(total)} />
            {condicional.vendaGerada && (
              <div className="pt-2">
                <Link
                  href={`/vendas`}
                  className="text-primary underline text-sm"
                >
                  Venda gerada #{condicional.vendaGerada.numero} —{" "}
                  {formatCurrency(condicional.vendaGerada.total)}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {finalizando ? "Classifique cada item" : "Itens"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {condicional.itens.map((i) => (
              <div key={i.id} className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-medium">{i.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {[i.cor, i.tamanho].filter(Boolean).join(" · ") || "—"} · Qtd:{" "}
                    {i.quantidade} · {formatCurrency(i.subtotal)}
                  </p>
                </div>

                {finalizando ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={classif[i.id] === "COMPRADO" ? "default" : "outline"}
                      onClick={() => setClassif((p) => ({ ...p, [i.id]: "COMPRADO" }))}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" /> Comprou
                    </Button>
                    <Button
                      size="sm"
                      variant={classif[i.id] === "DEVOLVIDO" ? "default" : "outline"}
                      onClick={() => setClassif((p) => ({ ...p, [i.id]: "DEVOLVIDO" }))}
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Devolveu
                    </Button>
                  </div>
                ) : i.statusFinal ? (
                  <Badge className={i.statusFinal === "COMPRADO" ? "bg-green-500" : "bg-gray-400"}>
                    {i.statusFinal === "COMPRADO" ? "Comprado" : "Devolvido"}
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {finalizando && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {temCompra && (
              <div className="space-y-2">
                <Label>Forma de pagamento (itens comprados)</Label>
                <div className="flex flex-wrap gap-2">
                  {FORMAS.map((f) => (
                    <Button
                      key={f.v}
                      size="sm"
                      variant={formaPagamento === f.v ? "default" : "outline"}
                      onClick={() => setFormaPagamento(f.v)}
                    >
                      {f.l}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <span className="font-semibold">Total a cobrar</span>
              <span className="text-2xl font-bold">{formatCurrency(totalComprado)}</span>
            </div>

            {erro && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {erro}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setFinalizando(false)} disabled={loading}>
                Voltar
              </Button>
              <Button onClick={finalizar} disabled={loading || !todosClassificados}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Finalização
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}
