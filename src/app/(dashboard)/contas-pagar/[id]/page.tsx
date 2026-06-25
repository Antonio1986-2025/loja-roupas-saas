"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Save, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function EditarContaPagarPage() {
  const router = useRouter();
  const params = useParams();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [dialogDeleteOpen, setDialogDeleteOpen] = useState(false);
  const [erroDelete, setErroDelete] = useState("");
  const [erro, setErro] = useState("");
  const [conta, setConta] = useState<any>(null);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/fornecedores").then((r) => r.ok && r.json()),
      fetch(`/api/contas-pagar/${params.id}`).then((r) => r.ok && r.json()),
    ]).then(([fors, c]) => {
      setFornecedores(fors || []);
      setConta(c);
      if (c) {
        const form = document.forms.namedItem("formConta") as HTMLFormElement;
        if (form) {
          (form.elements.namedItem("descricao") as HTMLInputElement).value = c.descricao;
          (form.elements.namedItem("valor") as HTMLInputElement).value = c.valor;
          (form.elements.namedItem("dataVencimento") as HTMLInputElement).value = c.dataVencimento?.split("T")[0] || "";
          (form.elements.namedItem("categoria") as HTMLSelectElement).value = c.categoria || "OUTRO";
          (form.elements.namedItem("fornecedorId") as HTMLSelectElement).value = c.fornecedorId || "";
          (form.elements.namedItem("observacoes") as HTMLTextAreaElement).value = c.observacoes || "";
        }
      }
    }).catch(() => router.push("/contas-pagar"))
    .finally(() => setCarregando(false));
  }, [params.id, router]);

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
      fornecedorId: form.get("fornecedorId") as string,
      observacoes: form.get("observacoes") as string,
    };

    try {
      const res = await fetch(`/api/contas-pagar/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); setErro(err.message || "Erro"); return; }
      router.push("/contas-pagar");
      router.refresh();
    } catch { setErro("Erro de conexão."); }
    finally { setSalvando(false); }
  }

  async function handleExcluir() {
    setExcluindo(true);
    setErroDelete("");
    try {
      const res = await fetch(`/api/contas-pagar/${params.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); setErroDelete(err.message || "Erro ao excluir"); return; }
      setDialogDeleteOpen(false);
      router.push("/contas-pagar");
      router.refresh();
    } catch { setErroDelete("Erro de conexão."); }
    finally { setExcluindo(false); }
  }

  async function handlePagar() {
    const res = await fetch(`/api/contas-pagar/${params.id}`, { method: "PATCH" });
    if (res.ok) { router.push("/contas-pagar"); router.refresh(); }
    else { setErro("Erro ao marcar como paga"); }
  }

  if (carregando) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/contas-pagar"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Conta</h1>
            <p className="text-muted-foreground">Atualize as informações da conta</p>
          </div>
        </div>
        <div className="flex gap-2">
          {conta?.status !== "PAGO" && (
            <Button variant="default" onClick={handlePagar}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como Paga
            </Button>
          )}
          <Dialog open={dialogDeleteOpen} onOpenChange={setDialogDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            </DialogTrigger>
            <DialogContent>
              {erroDelete ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" /> Erro ao excluir
                    </DialogTitle>
                    <DialogDescription>{erroDelete}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setErroDelete(""); setDialogDeleteOpen(false); }}>
                      Fechar
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Excluir Conta a Pagar</DialogTitle>
                    <DialogDescription>
                      Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogDeleteOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleExcluir} disabled={excluindo}>
                      {excluindo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Excluir
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <form name="formConta" onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Informações da Conta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {erro && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Input id="descricao" name="descricao" required placeholder="Ex: Aluguel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input id="valor" name="valor" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataVencimento">Vencimento *</Label>
                <Input id="dataVencimento" name="dataVencimento" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <select id="categoria" name="categoria" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="OUTRO">Outro</option>
                  <option value="ALUGUEL">Aluguel</option>
                  <option value="AGUA">Água</option>
                  <option value="LUZ">Luz</option>
                  <option value="TELEFONE">Telefone</option>
                  <option value="INTERNET">Internet</option>
                  <option value="FORNECEDOR">Fornecedor</option>
                  <option value="IMPOSTO">Imposto</option>
                  <option value="SALARIO">Salário</option>
                  <option value="PROLABORE">Pró-labore</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedorId">Fornecedor</Label>
                <select id="fornecedorId" name="fornecedorId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Nenhum</option>
                  {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
                </select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <textarea id="observacoes" name="observacoes" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" rows={3} />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" asChild><Link href="/contas-pagar">Cancelar</Link></Button>
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
