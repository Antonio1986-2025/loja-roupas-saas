"use client";
import { fotoUrl as gdFotoUrl } from "@/lib/google-drive";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Trash2, Plus } from "lucide-react";
import Link from "next/link";

type VarianteForm = {
  id?: string;
  cor: string;
  tamanho: string;
  codigoBarras: string;
  precoVenda: string;
  estoqueMinimo: string;
  qtdEstoque: string;
};

export default function EditarProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");
  const [categorias, setCategorias] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [fotoUrl, setFotoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [variantes, setVariantes] = useState<VarianteForm[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/categorias").then((r) => r.ok && r.json()),
      fetch("/api/fornecedores").then((r) => r.ok && r.json()),
      fetch(`/api/produtos/${params.id}`).then((r) => r.ok && r.json()),
    ]).then(([cats, fors, prod]) => {
      setCategorias(cats || []);
      setFornecedores(fors || []);

      if (prod) {
        const form = document.forms.namedItem("formProduto") as HTMLFormElement;
        if (form) {
          (form.elements.namedItem("nome") as HTMLInputElement).value = prod.nome;
          (form.elements.namedItem("descricao") as HTMLTextAreaElement).value = prod.descricao || "";
          (form.elements.namedItem("marca") as HTMLInputElement).value = prod.marca || "";
          (form.elements.namedItem("genero") as HTMLSelectElement).value = prod.genero || "";
          (form.elements.namedItem("categoriaId") as HTMLSelectElement).value = prod.categoriaId || "";
          (form.elements.namedItem("fornecedorId") as HTMLSelectElement).value = prod.fornecedorId || "";
          (form.elements.namedItem("codigoInterno") as HTMLInputElement).value = prod.codigoInterno || "";
          (form.elements.namedItem("precoVenda") as HTMLInputElement).value = prod.precoVenda;
          (form.elements.namedItem("precoCusto") as HTMLInputElement).value = prod.precoCusto || "";
          (form.elements.namedItem("ativo") as HTMLInputElement).checked = prod.ativo;
        }

        if (prod.fotoUrl) setFotoUrl(prod.fotoUrl);
        setVariantes(
          prod.variantes?.map((v: any) => ({
            id: v.id,
            cor: v.cor || "",
            tamanho: v.tamanho || "",
            codigoBarras: v.codigoBarras || "",
            precoVenda: v.precoVenda?.toString() || "",
            estoqueMinimo: v.estoqueMinimo?.toString() || "0",
            qtdEstoque: v.qtdEstoque?.toString() || "0",
          })) || []
        );
      }
    }).catch(() => {
      router.push("/produtos");
    }).finally(() => {
      setCarregando(false);
    });
  }, [params.id, router]);

  function addVariante() {
    setVariantes([...variantes, { cor: "", tamanho: "", codigoBarras: "", precoVenda: "", estoqueMinimo: "0", qtdEstoque: "0" }]);
  }

  function removeVariante(index: number) {
    setVariantes(variantes.filter((_, i) => i !== index));
  }

  function updateVariante(index: number, field: keyof VarianteForm, value: string) {
    const novas = [...variantes];
    novas[index] = { ...novas[index], [field]: value };
    setVariantes(novas);
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload/produto", { method: "POST", body: formData });
    if (res.ok) {
      const json = await res.json();
      setFotoUrl(json.url);
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const form = new FormData(e.currentTarget);

    const variantesValidas = variantes.filter((v) => v.codigoBarras.trim());
    if (variantesValidas.length === 0) {
      setErro("Adicione pelo menos uma variação com código de barras");
      setSalvando(false);
      return;
    }

    const data = {
      nome: form.get("nome") as string,
      descricao: form.get("descricao") as string,
      marca: form.get("marca") as string,
      genero: form.get("genero") as string,
      precoVenda: form.get("precoVenda") as string,
      precoCusto: form.get("precoCusto") as string,
      categoriaId: form.get("categoriaId") as string,
      fornecedorId: form.get("fornecedorId") as string,
      codigoInterno: form.get("codigoInterno") as string,
      fotoUrl,
      ativo: form.get("ativo") === "on",
      variantes: variantesValidas,
    };

    try {
      const res = await fetch(`/api/produtos/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || err.issues?.[0]?.message || "Erro ao atualizar produto");
        return;
      }

      router.push("/produtos");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    setErro("");
    setExcluindo(true);

    try {
      const res = await fetch(`/api/produtos/${params.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao excluir produto");
        return;
      }
      router.push("/produtos");
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
            <Link href="/produtos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Produto</h1>
            <p className="text-muted-foreground">Atualize as informações do produto</p>
          </div>
        </div>
        <Button variant="destructive" onClick={handleExcluir} disabled={excluindo}>
          {excluindo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Excluir
        </Button>
      </div>

      <form name="formProduto" onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {erro && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {erro}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Foto do Produto</Label>
                  <div className="flex items-center gap-4">
                    {(previewUrl || fotoUrl) && (
                      <img src={previewUrl || gdFotoUrl(fotoUrl, "full") || fotoUrl} alt="Preview" className="w-20 h-20 object-cover rounded-md border" />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFotoChange}
                        className="cursor-pointer"
                      />
                      {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando foto...</p>}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" name="nome" required placeholder="Nome do produto" />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Descrição do produto..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input id="marca" name="marca" placeholder="Ex: Nike, Adidas" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genero">Gênero</Label>
                  <select
                    id="genero"
                    name="genero"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Selecione...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="UNISSEX">Unissex</option>
                    <option value="INFANTIL">Infantil</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoriaId">Categoria</Label>
                  <select
                    id="categoriaId"
                    name="categoriaId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Selecione...</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fornecedorId">Fornecedor</Label>
                  <select
                    id="fornecedorId"
                    name="fornecedorId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Selecione...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigoInterno">Código Interno</Label>
                  <Input id="codigoInterno" name="codigoInterno" placeholder="Código interno" />
                </div>
              </div>

              <div className="pt-4 border-t grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="precoVenda">Preço de Venda *</Label>
                  <Input id="precoVenda" name="precoVenda" type="number" step="0.01" required placeholder="99,90" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precoCusto">Preço de Custo</Label>
                  <Input id="precoCusto" name="precoCusto" type="number" step="0.01" placeholder="50,00" />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="ativo"
                    name="ativo"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <Label htmlFor="ativo" className="cursor-pointer">Produto ativo</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Variações</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addVariante}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gerencie as variações do produto (cores, tamanhos, etc.)
              </p>

              {variantes.map((v, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Variação {i + 1}</span>
                    {variantes.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeVariante(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Cor</Label>
                      <Input
                        value={v.cor}
                        onChange={(e) => updateVariante(i, "cor", e.target.value)}
                        placeholder="Ex: Preto"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tamanho</Label>
                      <Input
                        value={v.tamanho}
                        onChange={(e) => updateVariante(i, "tamanho", e.target.value)}
                        placeholder="Ex: P, M, G"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cód. Barras *</Label>
                      <Input
                        value={v.codigoBarras}
                        onChange={(e) => updateVariante(i, "codigoBarras", e.target.value)}
                        placeholder="789..."
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Preço (opcional)</Label>
                      <Input
                        value={v.precoVenda}
                        onChange={(e) => updateVariante(i, "precoVenda", e.target.value)}
                        type="number"
                        step="0.01"
                        placeholder="Deixe vazio = preço do produto"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Estoque</Label>
                      <Input
                        value={v.qtdEstoque}
                        onChange={(e) => updateVariante(i, "qtdEstoque", e.target.value)}
                        type="number"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Estoque Mínimo</Label>
                      <Input
                        value={v.estoqueMinimo}
                        onChange={(e) => updateVariante(i, "estoqueMinimo", e.target.value)}
                        type="number"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <Button variant="outline" asChild>
            <Link href="/produtos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Produto
          </Button>
        </div>
      </form>
    </div>
  );
}
