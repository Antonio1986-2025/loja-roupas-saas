"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

export default function NovaContaReceberPage() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.ok && r.json()).then(setClientes).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const form = new FormData(e.currentTarget);
    const data = {
      descricao: form.get("descricao") as string,
      valor: form.get("valor") as string,
      dataVencimento: form.get("dataVencimento") as string,
      categoria: form.get("categoria") as string,
      formaPagamento: form.get("formaPagamento") as string,
      clienteId: form.get("clienteId") as string,
      observacoes: form.get("observacoes") as string,
    };

    try {
      const res = await fetch("/api/contas-receber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao cadastrar");
        return;
      }

      router.push("/contas-receber");
      router.refresh();
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/contas-receber"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Conta a Receber</h1>
          <p className="text-muted-foreground">Cadastre um novo recebimento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {erro && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Input id="descricao" name="descricao" required placeholder="Ex: Parcela venda #123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input id="valor" name="valor" type="number" step="0.01" required placeholder="1500,00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataVencimento">Data de Vencimento *</Label>
                <Input id="dataVencimento" name="dataVencimento" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <select id="categoria" name="categoria" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="CLIENTE">Cliente</option>
                  <option value="VENDA">Venda</option>
                  <option value="SERVICO">Serviço</option>
                  <option value="INVESTIMENTO">Investimento</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <select id="formaPagamento" name="formaPagamento" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clienteId">Cliente</Label>
                <select id="clienteId" name="clienteId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Nenhum</option>
                  {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
                </select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <textarea id="observacoes" name="observacoes" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" rows={3} />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" asChild><Link href="/contas-receber">Cancelar</Link></Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
