"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Loader2, Save, Trash2, ShoppingBag, FileText } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type FormData = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  observacoes: string;
};

const FORM_VAZIO: FormData = {
  nome: "", cpf: "", telefone: "", email: "",
  dataNascimento: "", endereco: "", cidade: "",
  estado: "", cep: "", observacoes: "",
};

export default function ClienteDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");
  const [erroDelete, setErroDelete] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/clientes/${params.id}`);
        if (!res.ok) { router.push("/clientes"); return; }
        const data = await res.json();
        setCliente(data);
        setForm({
          nome:           data.nome          ?? "",
          cpf:            data.cpf           ?? "",
          telefone:       data.telefone      ?? "",
          email:          data.email         ?? "",
          dataNascimento: data.dataNascimento ? data.dataNascimento.split("T")[0] : "",
          endereco:       data.endereco      ?? "",
          cidade:         data.cidade        ?? "",
          estado:         data.estado        ?? "",
          cep:            data.cep           ?? "",
          observacoes:    data.observacoes   ?? "",
        });
      } catch {
        router.push("/clientes");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [params.id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const res = await fetch(`/api/clientes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao atualizar cliente");
        return;
      }
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    setErroDelete("");
    setExcluindo(true);
    try {
      const res = await fetch(`/api/clientes/${params.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setErroDelete(err.message || "Erro ao excluir cliente");
        return;
      }
      router.push("/clientes");
      router.refresh();
    } catch {
      setErroDelete("Erro de conexão. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clientes"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{cliente?.nome}</h1>
            <p className="text-muted-foreground">Detalhes e edição do cliente</p>
          </div>
        </div>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Vendas</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            <p className="text-2xl font-bold">{cliente?._count?.vendas ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Condicionais</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-2xl font-bold">{cliente?._count?.vendasCondicionais ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Cadastrado em</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {cliente?.createdAt ? new Date(cliente.createdAt).toLocaleDateString("pt-BR") : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Informações do Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {erro && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required value={form.nome} onChange={handleChange} placeholder="Nome completo" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" value={form.telefone} onChange={handleChange} placeholder="(11) 99999-9999" />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="cliente@exemplo.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input id="dataNascimento" name="dataNascimento" type="date" value={form.dataNascimento} onChange={handleChange} />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Endereço</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" name="endereco" value={form.endereco} onChange={handleChange} placeholder="Rua, número, bairro" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" name="cidade" value={form.cidade} onChange={handleChange} placeholder="São Paulo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input id="estado" name="estado" value={form.estado} onChange={handleChange} placeholder="SP" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" name="cep" value={form.cep} onChange={handleChange} placeholder="00000-000" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" asChild>
                <Link href="/clientes">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Dialog open={deleteOpen} onOpenChange={(v) => { if (!excluindo) { setDeleteOpen(v); setErroDelete(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Se houver vendas vinculadas, a exclusão será bloqueada.
            </DialogDescription>
          </DialogHeader>
          {erroDelete && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{erroDelete}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={excluindo}>
              {erroDelete ? "Fechar" : "Cancelar"}
            </Button>
            {!erroDelete && (
              <Button variant="destructive" onClick={handleExcluir} disabled={excluindo}>
                {excluindo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Excluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
