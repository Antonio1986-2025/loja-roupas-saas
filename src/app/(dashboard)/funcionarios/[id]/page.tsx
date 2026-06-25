"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import Link from "next/link";

export default function EditarFuncionarioPage() {
  const router = useRouter();
  const params = useParams();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/funcionarios/${params.id}`);
        if (!res.ok) {
          router.push("/funcionarios");
          return;
        }
        const data = await res.json();
        const form = document.forms.namedItem("formFuncionario") as HTMLFormElement;
        if (form) {
          (form.elements.namedItem("nome") as HTMLInputElement).value = data.nome;
          (form.elements.namedItem("cpf") as HTMLInputElement).value = data.cpf;
          (form.elements.namedItem("telefone") as HTMLInputElement).value = data.telefone || "";
          (form.elements.namedItem("email") as HTMLInputElement).value = data.email || "";
          (form.elements.namedItem("cargo") as HTMLInputElement).value = data.cargo || "";
          (form.elements.namedItem("salario") as HTMLInputElement).value = data.salario || "";
          (form.elements.namedItem("dataAdmissao") as HTMLInputElement).value =
            data.dataAdmissao?.split("T")[0] || "";
          (form.elements.namedItem("dataDemissao") as HTMLInputElement).value =
            data.dataDemissao?.split("T")[0] || "";
          (form.elements.namedItem("ativo") as HTMLInputElement).checked = data.ativo;
        }
      } catch {
        router.push("/funcionarios");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [params.id, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const form = new FormData(e.currentTarget);
    const data = {
      nome: form.get("nome") as string,
      cpf: form.get("cpf") as string,
      telefone: form.get("telefone") as string,
      email: form.get("email") as string,
      cargo: form.get("cargo") as string,
      salario: form.get("salario") as string,
      dataAdmissao: form.get("dataAdmissao") as string,
      dataDemissao: form.get("dataDemissao") as string,
      ativo: form.get("ativo") === "on",
    };

    try {
      const res = await fetch(`/api/funcionarios/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao atualizar funcionário");
        return;
      }

      router.push("/funcionarios");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;

    setErro("");
    setExcluindo(true);

    try {
      const res = await fetch(`/api/funcionarios/${params.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao excluir funcionário");
        return;
      }

      router.push("/funcionarios");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
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
            <Link href="/funcionarios">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Funcionário</h1>
            <p className="text-muted-foreground">
              Atualize as informações do funcionário
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={handleExcluir}
          disabled={excluindo}
        >
          {excluindo ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Excluir
        </Button>
      </div>

      <form name="formFuncionario" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Funcionário</CardTitle>
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
                <Input id="nome" name="nome" required placeholder="Nome completo" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  required
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="funcionario@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  name="cargo"
                  placeholder="Ex: Vendedor, Caixa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salario">Salário (R$)</Label>
                <Input
                  id="salario"
                  name="salario"
                  type="number"
                  step="0.01"
                  placeholder="1500,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataAdmissao">Data de Admissão *</Label>
                <Input
                  id="dataAdmissao"
                  name="dataAdmissao"
                  type="date"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataDemissao">Data de Demissão</Label>
                <Input
                  id="dataDemissao"
                  name="dataDemissao"
                  type="date"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="ativo"
                  name="ativo"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <Label htmlFor="ativo" className="cursor-pointer">Funcionário ativo</Label>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" asChild>
                <Link href="/funcionarios">Cancelar</Link>
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
