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
import { ArrowLeft, Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";

type FormData = {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  observacoes: string;
};

const FORM_VAZIO: FormData = {
  nome: "",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  observacoes: "",
};

export default function EditarFornecedorPage() {
  const router = useRouter();
  const params = useParams();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [dialogDeleteOpen, setDialogDeleteOpen] = useState(false);
  const [erroDelete, setErroDelete] = useState("");
  const [erro, setErro] = useState("");
  const [form, setForm] = useState<FormData>(FORM_VAZIO);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/fornecedores/${params.id}`);
        if (!res.ok) {
          router.push("/fornecedores");
          return;
        }
        const data = await res.json();
        setForm({
          nome:        data.nome        ?? "",
          cnpj:        data.cnpj        ?? "",
          telefone:    data.telefone    ?? "",
          email:       data.email       ?? "",
          endereco:    data.endereco    ?? "",
          cidade:      data.cidade      ?? "",
          estado:      data.estado      ?? "",
          cep:         data.cep         ?? "",
          observacoes: data.observacoes ?? "",
        });
      } catch {
        router.push("/fornecedores");
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
      const res = await fetch(`/api/fornecedores/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao atualizar fornecedor");
        return;
      }

      router.push("/fornecedores");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    setExcluindo(true);
    setErroDelete("");
    try {
      const res = await fetch(`/api/fornecedores/${params.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); setErroDelete(err.message || "Erro ao excluir"); return; }
      setDialogDeleteOpen(false);
      router.push("/fornecedores");
      router.refresh();
    } catch { setErroDelete("Erro de conexão."); }
    finally { setExcluindo(false); }
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
            <Link href="/fornecedores">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Fornecedor</h1>
            <p className="text-muted-foreground">
              Atualize as informações do fornecedor
            </p>
          </div>
        </div>
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
                  <DialogTitle>Excluir Fornecedor</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
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

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Fornecedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {erro && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {erro}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required value={form.nome} onChange={handleChange} placeholder="Nome do fornecedor" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  value={form.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="fornecedor@exemplo.com"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  name="endereco"
                  value={form.endereco}
                  onChange={handleChange}
                  placeholder="Rua, número, bairro"
                />
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

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" asChild>
                <Link href="/fornecedores">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
