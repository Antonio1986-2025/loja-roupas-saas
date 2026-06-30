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

type FormData = {
  descricao: string;
  valor: string;
  dataVencimento: string;
  categoria: string;
  formaPagamento: string;
  clienteId: string;
  observacoes: string;
};

const FORM_VAZIO: FormData = {
  descricao: "",
  valor: "",
  dataVencimento: "",
  categoria: "CLIENTE",
  formaPagamento: "",
  clienteId: "",
  observacoes: "",
};

export default function EditarContaReceberPage() {
  const router = useRouter();
  const params = useParams();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [dialogDeleteOpen, setDialogDeleteOpen] = useState(false);
  const [erroDelete, setErroDelete] = useState("");
  const [erro, setErro] = useState("");
  const [conta, setConta] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then((r) => r.ok && r.json()),
      fetch(`/api/contas-receber/${params.id}`).then((r) => r.ok && r.json()),
    ]).then(([cls, c]) => {
      setClientes(cls || []);
      setConta(c);
      if (c) {
        setForm({
          descricao:      c.descricao ?? "",
          valor:          c.valor != null ? String(c.valor) : "",
          dataVencimento: c.dataVencimento ? c.dataVencimento.split("T")[0] : "",
          categoria:      c.categoria ?? "CLIENTE",
          formaPagamento: c.formaPagamento ?? "",
          clienteId:      c.clienteId ?? "",
          observacoes:    c.observacoes ?? "",
        });
      }
    }).catch(() => router.push("/contas-receber"))
    .finally(() => setCarregando(false));
  }, [params.id, router]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setSalvando(true);
    const data = {
      descricao: form.descricao,
      valor: form.valor,
      dataVencimento: form.dataVencimento,
      categoria: form.categoria,
      formaPagamento: form.formaPagamento,
      clienteId: form.clienteId,
      observacoes: form.observacoes,
    };
    try {
      const res = await fetch(`/api/contas-receber/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); setErro(err.message); return; }
      router.push("/contas-receber"); router.refresh();
    } catch { setErro("Erro de conexão."); }
    finally { setSalvando(false); }
  }

  async function handleExcluir() {
    setExcluindo(true);
    setErroDelete("");
    try {
      const res = await fetch(`/api/contas-receber/${params.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); setErroDelete(err.message || "Erro ao excluir"); return; }
      setDialogDeleteOpen(false);
      router.push("/contas-receber"); router.refresh();
    } catch { setErroDelete("Erro de conexão."); }
    finally { setExcluindo(false); }
  }

  async function handleReceber() {
    const res = await fetch(`/api/contas-receber/${params.id}`, { method: "PATCH" });
    if (res.ok) { router.push("/contas-receber"); router.refresh(); }
    else setErro("Erro ao marcar como recebida");
  }

  if (carregando) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/contas-receber"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Conta a Receber</h1>
            <p className="text-muted-foreground">Atualize as informações</p>
          </div>
        </div>
        <div className="flex gap-2">
          {conta?.status !== "PAGO" && (
            <Button variant="default" onClick={handleReceber}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como Recebida
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
                    <DialogTitle>Excluir Conta a Receber</DialogTitle>
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

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {erro && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Input id="descricao" name="descricao" required value={form.descricao} onChange={handleChange} placeholder="Parcela venda #123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input id="valor" name="valor" type="number" step="0.01" required value={form.valor} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataVencimento">Vencimento *</Label>
                <Input id="dataVencimento" name="dataVencimento" type="date" required value={form.dataVencimento} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <select id="categoria" name="categoria" value={form.categoria} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="CLIENTE">Cliente</option>
                  <option value="VENDA">Venda</option>
                  <option value="SERVICO">Serviço</option>
                  <option value="INVESTIMENTO">Investimento</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <select id="formaPagamento" name="formaPagamento" value={form.formaPagamento} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
                <select id="clienteId" name="clienteId" value={form.clienteId} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Nenhum</option>
                  {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
                </select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <textarea id="observacoes" name="observacoes" value={form.observacoes} onChange={handleChange} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" rows={3} />
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
