"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Search, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const statusColors: Record<string, string> = {
  AUTORIZADA: "bg-green-500", ENVIADA: "bg-yellow-500", REJEITADA: "bg-red-500",
  DENEGADA: "bg-red-600", CANCELADA: "bg-gray-500", DIGITADA: "bg-blue-500",
  INUTILIZADA: "bg-orange-500", ERRO: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  AUTORIZADA: "Autorizada", ENVIADA: "Pendente", REJEITADA: "Rejeitada",
  DENEGADA: "Denegada", CANCELADA: "Cancelada", DIGITADA: "Rascunho",
  INUTILIZADA: "Inutilizada", ERRO: "Erro",
};

const tipoLabels: Record<string, string> = {
  NFE: "NF-e", NFCE: "NFC-e",
};

export default function NotasFiscaisPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [notas, setNotas] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    carregarNotas();
  }, []);

  async function carregarNotas() {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set("status", filtroStatus);
      if (filtroTipo) params.set("tipo", filtroTipo);
      const res = await fetch(`/api/nfe/list?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotas(data);
      }
    } catch {} finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarNotas();
  }, [filtroStatus, filtroTipo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notas Fiscais</h1>
        <p className="text-muted-foreground">NF-e e NFC-e emitidas</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="AUTORIZADA">Autorizadas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="REJEITADA">Rejeitadas</option>
          <option value="DENEGADA">Denegadas</option>
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="NFE">NF-e</option>
          <option value="NFCE">NFC-e</option>
        </select>
        <Button variant="outline" size="sm" onClick={carregarNotas}>
          Filtrar
        </Button>
      </div>

      {/* Listagem */}
      {carregando ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">Nenhuma NF-e encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              As notas fiscais emitidas aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Nº</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">Cliente</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase">Data</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {notas.map((nota) => (
                  <tr key={nota.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className="font-mono">#{nota.numero} / S{nota.serie}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {tipoLabels[nota.tipo] || nota.tipo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {nota.clienteNome || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(Number(nota.valorTotal))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${statusColors[nota.status] || "bg-gray-400"} text-white text-xs`}>
                        {statusLabels[nota.status] || nota.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-muted-foreground">
                      {formatDateTime(nota.dataEmissao)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/notas-fiscais/${nota.id}`}>Ver</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
