"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { DeleteCategoriaButton } from "@/components/delete-categoria-button";

export default function EditarCategoriaPage() {
  const router = useRouter();
  const params = useParams();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/categorias/${params.id}`);
        if (!res.ok) {
          router.push("/categorias");
          return;
        }
        const data = await res.json();
        const form = document.forms.namedItem("formCategoria") as HTMLFormElement;
        if (form) {
          (form.elements.namedItem("nome") as HTMLInputElement).value = data.nome;
        }
      } catch {
        router.push("/categorias");
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
    const nome = form.get("nome") as string;

    try {
      const res = await fetch(`/api/categorias/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao atualizar categoria");
        return;
      }

      router.push("/categorias");
      router.refresh();
    } catch {
      setErro("Erro de conexao. Tente novamente.");
    } finally {
      setSalvando(false);
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
            <Link href="/categorias">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Categoria</h1>
            <p className="text-muted-foreground">Atualize as informacoes da categoria</p>
          </div>
        </div>
        <DeleteCategoriaButton categoriaId={params.id as string} />
      </div>

      <form name="formCategoria" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informacoes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {erro && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {erro}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Categoria *</Label>
              <Input
                id="nome"
                name="nome"
                required
                maxLength={100}
                placeholder="Ex: Camisetas, Calcas, Vestidos"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" asChild>
                <Link href="/categorias">Cancelar</Link>
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