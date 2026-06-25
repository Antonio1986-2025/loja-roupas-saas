"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Shield, Upload, Trash2 } from "lucide-react";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [certificadoNome, setCertificadoNome] = useState("");
  const [certificadoArquivo, setCertificadoArquivo] = useState<File | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch("/api/configuracoes");
        if (!res.ok) return;
        const data = await res.json();
        const form = document.forms.namedItem("formConfig") as HTMLFormElement;
        if (form) {
          (form.elements.namedItem("nomeEmpresa") as HTMLInputElement).value = data.nomeEmpresa;
          (form.elements.namedItem("cnpj") as HTMLInputElement).value = data.cnpj || "";
          (form.elements.namedItem("telefone") as HTMLInputElement).value = data.telefone || "";
          (form.elements.namedItem("email") as HTMLInputElement).value = data.email || "";
          (form.elements.namedItem("endereco") as HTMLInputElement).value = data.endereco || "";
          (form.elements.namedItem("cidade") as HTMLInputElement).value = data.cidade || "";
          (form.elements.namedItem("estado") as HTMLInputElement).value = data.estado || "";
          (form.elements.namedItem("cep") as HTMLInputElement).value = data.cep || "";
          (form.elements.namedItem("corPrimaria") as HTMLInputElement).value = data.corPrimaria || "#3b82f6";
          (form.elements.namedItem("corSecundaria") as HTMLInputElement).value = data.corSecundaria || "#8b5cf6";
          (form.elements.namedItem("emailNotificacoes") as HTMLInputElement).checked = data.emailNotificacoes ?? true;
          (form.elements.namedItem("alertaEstoqueBaixo") as HTMLInputElement).checked = data.alertaEstoqueBaixo ?? true;
          if (data.senhaCertificado) {
            (form.elements.namedItem("senhaCertificado") as HTMLInputElement).value = data.senhaCertificado;
          }
        }
        if (data.certificadoA1) {
          setCertificadoNome("Certificado configurado");
        }
      } catch {
        // silently fail, form stays empty
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const form = new FormData(e.currentTarget);
    let certificadoA1 = form.get("certificadoA1") as string;
    if (certificadoArquivo) {
      const buffer = await certificadoArquivo.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      certificadoA1 = btoa(binary);
    }

    const data = {
      nomeEmpresa: form.get("nomeEmpresa") as string,
      cnpj: form.get("cnpj") as string,
      telefone: form.get("telefone") as string,
      email: form.get("email") as string,
      endereco: form.get("endereco") as string,
      cidade: form.get("cidade") as string,
      estado: form.get("estado") as string,
      cep: form.get("cep") as string,
      corPrimaria: form.get("corPrimaria") as string,
      corSecundaria: form.get("corSecundaria") as string,
      emailNotificacoes: form.get("emailNotificacoes") === "on",
      alertaEstoqueBaixo: form.get("alertaEstoqueBaixo") === "on",
      certificadoA1,
      senhaCertificado: form.get("senhaCertificado") as string || null,
    };

    try {
      const res = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao salvar configurações");
        return;
      }

      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
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
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Configure as informações da sua loja
        </p>
      </div>

      <form name="formConfig" onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {erro && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {erro}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="nomeEmpresa">Nome da Empresa *</Label>
                  <Input id="nomeEmpresa" name="nomeEmpresa" required placeholder="Nome da sua loja" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" name="telefone" placeholder="(11) 99999-9999" />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="contato@minhaloja.com" />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" name="endereco" placeholder="Rua, número, bairro" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" name="cidade" placeholder="São Paulo" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input id="estado" name="estado" placeholder="SP" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" name="cep" placeholder="00000-000" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="corPrimaria">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="corPrimaria"
                      name="corPrimaria"
                      type="color"
                      className="w-16 p-1 h-10"
                    />
                    <Input
                      name="corPrimariaHex"
                      placeholder="#3b82f6"
                      className="flex-1"
                      onChange={(e) => {
                        const color = document.getElementById("corPrimaria") as HTMLInputElement;
                        if (color) color.value = e.target.value;
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corSecundaria">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="corSecundaria"
                      name="corSecundaria"
                      type="color"
                      className="w-16 p-1 h-10"
                    />
                    <Input
                      name="corSecundariaHex"
                      placeholder="#8b5cf6"
                      className="flex-1"
                      onChange={(e) => {
                        const color = document.getElementById("corSecundaria") as HTMLInputElement;
                        if (color) color.value = e.target.value;
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Certificado A1 (SEFAZ)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Certificado digital A1 necessário para consultar NF-e por chave de acesso diretamente na SEFAZ.
              </p>
              <div className="space-y-2">
                <Label>Arquivo PFX</Label>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="certificado-upload"
                    className="flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted cursor-pointer text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    {certificadoNome ? "Substituir" : "Selecionar .pfx"}
                  </Label>
                  <Input
                    id="certificado-upload"
                    type="file"
                    accept=".pfx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCertificadoArquivo(file);
                        setCertificadoNome(file.name);
                      }
                    }}
                  />
                  {certificadoNome && (
                    <>
                      <span className="text-sm text-muted-foreground">{certificadoNome}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setCertificadoArquivo(null);
                          setCertificadoNome("");
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
                <input type="hidden" name="certificadoA1" value="" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senhaCertificado">Senha do Certificado</Label>
                <Input
                  id="senhaCertificado"
                  name="senhaCertificado"
                  type="password"
                  placeholder="Senha do arquivo .pfx"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    id="emailNotificacoes"
                    name="emailNotificacoes"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Notificações por email</p>
                    <p className="text-xs text-muted-foreground">
                      Receber notificações sobre vendas e pedidos
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    id="alertaEstoqueBaixo"
                    name="alertaEstoqueBaixo"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Alerta de estoque baixo</p>
                    <p className="text-xs text-muted-foreground">
                      Avisar quando um produto estiver com estoque baixo
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <Button type="submit" disabled={salvando}>
            {salvando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  );
}
