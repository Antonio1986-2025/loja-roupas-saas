import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Building2, FileText, Truck, DollarSign, Receipt, Tag } from "lucide-react";
import { ComprovanteEntrada } from "@/components/comprovante-entrada";

async function getEntrada(tenantId: string, id: string) {
  const entrada = await prisma.entradaMercadoria.findFirst({
    where: { id, tenantId },
    include: {
      fornecedor: { select: { nome: true, cnpj: true } },
      itens: {
        include: {
          variante: {
            include: {
              produto: { select: { nome: true, precoVenda: true } },
            },
          },
        },
      },
    },
  });
  return entrada;
}

export default async function EntradaDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const entrada = await getEntrada(session.user.tenantId, params.id);
  if (!entrada) notFound();

  const totalItens = entrada.itens.reduce((s, i) => s + i.quantidade, 0);
  const custoTotal = entrada.itens.reduce(
    (s, i) => s + Number(i.custoFinal || 0) * i.quantidade,
    0
  );
  const totalImpostos =
    Number(entrada.valorICMS || 0) +
    Number(entrada.valorPIS || 0) +
    Number(entrada.valorCOFINS || 0);
  const totalDespesas =
    Number(entrada.valorFrete || 0) +
    Number(entrada.valorSeguro || 0) +
    Number(entrada.valorDespesas || 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/entradas">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Entrada #{entrada.numero}</h1>
          {entrada.numeroNFe && (
            <p className="text-sm text-muted-foreground font-mono">
              NF-e {entrada.numeroNFe} {entrada.serieNFe ? `Série ${entrada.serieNFe}` : ""}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href={"/etiquetas?entradaId=" + params.id}>
            <Tag className="h-4 w-4 mr-1" /> Etiquetas
          </Link>
        </Button>
        <ComprovanteEntrada
          entrada={{
            numero: entrada.numero,
            numeroNFe: entrada.numeroNFe,
            serieNFe: entrada.serieNFe,
            dataEmissao: entrada.dataEmissao,
            createdAt: entrada.createdAt,
            fornecedor: entrada.fornecedor
              ? { nome: entrada.fornecedor.nome, cnpj: entrada.fornecedor.cnpj }
              : null,
            valorFrete: entrada.valorFrete ? Number(entrada.valorFrete) : null,
            valorSeguro: entrada.valorSeguro ? Number(entrada.valorSeguro) : null,
            valorDespesas: entrada.valorDespesas ? Number(entrada.valorDespesas) : null,
            valorDesconto: null,
            valorICMS: entrada.valorICMS ? Number(entrada.valorICMS) : null,
            observacao: entrada.observacao,
            itens: entrada.itens.map((item) => ({
              id: item.id,
              quantidade: item.quantidade,
              precoUnitario: Number(item.precoUnitario),
              custoFinal: item.custoFinal ? Number(item.custoFinal) : null,
              margemLucro: item.margemLucro ? Number(item.margemLucro) : null,
              precoVendaSugerido: item.precoVendaSugerido ? Number(item.precoVendaSugerido) : null,
              variante: {
                cor: item.variante.cor,
                tamanho: item.variante.tamanho,
                produto: { nome: item.variante.produto.nome },
              },
            })),
          }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {entrada.fornecedor ? (
              <>
                <p className="font-medium">{entrada.fornecedor.nome}</p>
                {entrada.fornecedor.cnpj && (
                  <p className="text-muted-foreground">CNPJ: {entrada.fornecedor.cnpj}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Fornecedor não informado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Nota Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {entrada.chaveAcesso ? (
              <>
                <p className="font-mono text-xs break-all">{entrada.chaveAcesso}</p>
                <p className="text-muted-foreground">
                  CFOP: {entrada.cfop || "—"} · {entrada.naturezaOperacao || "—"}
                </p>
                <p className="text-muted-foreground">
                  Emissão: {entrada.dataEmissao ? formatDate(entrada.dataEmissao) : "—"}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Sem nota fiscal</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalItens} itens</p>
            <p className="text-sm text-muted-foreground">{entrada.itens.length} variações</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" /> Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalDespesas)}</p>
            <p className="text-sm text-muted-foreground">
              Frete: {formatCurrency(Number(entrada.valorFrete || 0))}
              {entrada.valorSeguro && Number(entrada.valorSeguro) > 0
                ? ` · Seguro: ${formatCurrency(Number(entrada.valorSeguro))}`
                : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Receipt className="h-3 w-3" /> Impostos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalImpostos)}</p>
            <p className="text-sm text-muted-foreground">
              ICMS: {formatCurrency(Number(entrada.valorICMS || 0))}
              · PIS: {formatCurrency(Number(entrada.valorPIS || 0))}
              · COFINS: {formatCurrency(Number(entrada.valorCOFINS || 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Produto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Qtd</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Preço Unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Custo Final</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Margem</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Preço Sugerido</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {entrada.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.variante.produto.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {[item.variante.cor, item.variante.tamanho].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">{item.quantidade}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(Number(item.precoUnitario))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {item.custoFinal ? formatCurrency(Number(item.custoFinal)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.margemLucro ? `${item.margemLucro}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {item.precoVendaSugerido
                        ? formatCurrency(Number(item.precoVendaSugerido))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 md:hidden">
            {entrada.itens.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 text-sm">
                <p className="font-medium">{item.variante.produto.nome}</p>
                <p className="text-xs text-muted-foreground mb-1">
                  {[item.variante.cor, item.variante.tamanho].filter(Boolean).join(" · ") || "—"}
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span>Qtd: <strong>{item.quantidade}</strong></span>
                  <span className="text-right">Unit: <strong>{formatCurrency(Number(item.precoUnitario))}</strong></span>
                  <span>Custo: <strong>{item.custoFinal ? formatCurrency(Number(item.custoFinal)) : "—"}</strong></span>
                  <span className="text-right">Margem: <strong>{item.margemLucro ? `${item.margemLucro}%` : "—"}</strong></span>
                  <span className="col-span-2 text-right font-semibold">
                    Sugerido: {item.precoVendaSugerido ? formatCurrency(Number(item.precoVendaSugerido)) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor dos produtos</span>
              <span className="font-medium">
                {formatCurrency(entrada.itens.reduce((s, i) => s + Number(i.precoUnitario) * i.quantidade, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span className="font-medium">{formatCurrency(Number(entrada.valorFrete || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Despesas</span>
              <span className="font-medium">
                {formatCurrency(Number(entrada.valorDespesas || 0) + Number(entrada.valorSeguro || 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ICMS</span>
              <span className="font-medium">{formatCurrency(Number(entrada.valorICMS || 0))}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Custo total</span>
              <span className="font-bold text-lg">{formatCurrency(custoTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de entrada</span>
              <span className="font-medium">{formatDate(entrada.createdAt)}</span>
            </div>
            {entrada.gerarContasPagar && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contas a pagar</span>
                <Badge className="bg-green-500">Geradas</Badge>
              </div>
            )}
            {entrada.observacao && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground">Observações:</span>
                <p className="mt-1">{entrada.observacao}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {entrada.xmlOriginal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">XML da NF-e</CardTitle>
          </CardHeader>
          <CardContent>
            <details>
              <summary className="cursor-pointer text-sm text-primary hover:underline">
                Visualizar XML original
              </summary>
              <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
                {entrada.xmlOriginal}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
