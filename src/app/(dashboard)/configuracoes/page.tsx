"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Shield, Upload, Trash2, Building2, Image } from "lucide-react";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoLogo, setSalvandoLogo] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Campos da configuracao
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#3b82f6");
  const [corSecundaria, setCorSecundaria] = useState("#8b5cf6");
  const [emailNotificacoes, setEmailNotificacoes] = useState(true);
  const [alertaEstoqueBaixo, setAlertaEstoqueBaixo] = useState(true);
  const [certificadoNome, setCertificadoNome] = useState("");
  const [certificadoArquivo, setCertificadoArquivo] = useState<File | null>(null);
  const [senhaCertificado, setSenhaCertificado] = useState("");

  // Logo
  const [logoAtual, setLogoAtual] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoArquivo, setLogoArquivo] = useState<File | null>(null);
  const [erroLogo, setErroLogo] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const [resConfig, resLogo] = await Promise.all([
          fetch("/api/configuracoes"),
          fetch("/api/tenant/logo"),
        ]);

        if (resConfig.ok) {
          const d = await resConfig.json();
          setNomeEmpresa(d.nomeEmpresa || "");
          setCnpj(d.cnpj || "");
          setTelefone(d.telefone || "");
          setEmail(d.email || "");
          setEndereco(d.endereco || "");
          setCidade(d.cidade || "");
          setEstado(d.estado || "");
          setCep(d.cep || "");
          setCorPrimaria(d.corPrimaria || "#3b82f6");
          setCorSecundaria(d.corSecundaria || "#8b5cf6");
          setEmailNotificacoes(d.emailNotificacoes ?? true);
          setAlertaEstoqueBaixo(d.alertaEstoqueBaixo ?? true);
          if (d.certificadoA1) setCertificadoNome("Certificado configurado");
          if (d.senhaCertificado) setSenhaCertificado(d.senhaCertificado);
        }

        if (resLogo.ok) {
          const d = await resLogo.json();
          if (d.logo) setLogoAtual(d.logo);
        }
      } catch {
        // silently fail
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  async function handleSalvarLogo() {
    if (!logoArquivo) return;
    setSalvandoLogo(true);
    setErroLogo(false);
    try {
      const form = new FormData();
      form.append("file", logoArquivo);
      const res = await fetch("/api/configuracoes/logo", { method: "POST", body: form });
      if (res.ok) {
        const d = await res.json();
        setLogoAtual(d.url);
        setLogoArquivo(null);
        setLogoPreview(null);
        setSucesso("Logo atualizada com sucesso!");
        setTimeout(() => setSucesso(""), 3000);
      } else {
        setErro("Erro ao salvar a logo");
      }
    } catch {
      setErro("Erro de conexão");
    } finally {
      setSalvandoLogo(false);
    }
  }

  async function handleRemoverLogo() {
    if (!confirm("Remover a logo da loja?")) return;
    setSalvandoLogo(true);
    try {
      await fetch("/api/configuracoes/logo", { method: "DELETE" });
      setLogoAtual(null);
      setLogoPreview(null);
      setLogoArquivo(null);
    } catch {}
    finally { setSalvandoLogo(false); }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setSalvando(true);

    let certificadoA1 = "";
    if (certificadoArquivo) {
      const buffer = await certificadoArquivo.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      certificadoA1 = btoa(binary);
    }

    try {
      const res = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeEmpresa, cnpj, telefone, email, endereco,
          cidade, estado, cep, corPrimaria, corSecundaria,
          emailNotificacoes, alertaEstoqueBaixo,
          certificadoA1: certificadoA1 || undefined,
          senhaCertificado: senhaCertificado || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.message || "Erro ao salvar configurações");
      } else {
        setSucesso("Configurações salvas com sucesso!");
        setTimeout(() => setSucesso(""), 3000);
        router.refresh();
      }
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
        <p className="text-muted-foreground">Configure as informações da sua loja</p>
      </div>

      {sucesso && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          ✓ {sucesso}
        </div>
      )}
      {erro && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Logo da Loja */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-4 w-4" /> Logo da Loja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A logo aparece na barra lateral do sistema e nos documentos da loja.
            Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 2MB.
          </p>

          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {(logoPreview || logoAtual) && !erroLogo ? (
                <img
                  src={logoPreview || logoAtual || ""}
                  alt="Logo"
                  className="h-full w-full object-contain"
                  onError={() => setErroLogo(true)}
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="logo-upload"
                className="flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted cursor-pointer text-sm font-medium w-fit"
              >
                <Upload className="h-4 w-4" />
                {logoAtual ? "Trocar logo" : "Selecionar logo"}
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    setErro("Imagem muito grande. Máximo 2MB.");
                    return;
                  }
                  setLogoArquivo(file);
                  setErroLogo(false);
                  const reader = new FileReader();
                  reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              {logoArquivo && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{logoArquivo.name}</span>
                  <Button size="sm" onClick={handleSalvarLogo} disabled={salvandoLogo} className="h-7 text-xs">
                    {salvandoLogo ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar logo"}
                  </Button>
                </div>
              )}
              {logoAtual && !logoArquivo && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive w-fit"
                  onClick={handleRemoverLogo}
                  disabled={salvandoLogo}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Remover logo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="nomeEmpresa">Nome da Empresa *</Label>
                  <Input id="nomeEmpresa" required value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Nome da sua loja" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@minhaloja.com" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="São Paulo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input id="estado" value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="SP" maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
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
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)}
                      className="h-10 w-14 rounded border cursor-pointer p-1" />
                    <Input value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} placeholder="#3b82f6" className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)}
                      className="h-10 w-14 rounded border cursor-pointer p-1" />
                    <Input value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)} placeholder="#8b5cf6" className="flex-1" />
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
                  <Label htmlFor="cert-upload" className="flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted cursor-pointer text-sm">
                    <Upload className="h-4 w-4" />
                    {certificadoNome ? "Substituir" : "Selecionar .pfx"}
                  </Label>
                  <Input id="cert-upload" type="file" accept=".pfx" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCertificadoArquivo(f); setCertificadoNome(f.name); } }} />
                  {certificadoNome && (
                    <>
                      <span className="text-sm text-muted-foreground">{certificadoNome}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setCertificadoArquivo(null); setCertificadoNome(""); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="senhaCert">Senha do Certificado</Label>
                <Input id="senhaCert" type="password" value={senhaCertificado}
                  onChange={(e) => setSenhaCertificado(e.target.value)} placeholder="Senha do arquivo .pfx" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notificações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={emailNotificacoes} onChange={(e) => setEmailNotificacoes(e.target.checked)}
                  className="h-4 w-4 rounded border-input" />
                <div>
                  <p className="text-sm font-medium">Notificações por email</p>
                  <p className="text-xs text-muted-foreground">Receber notificações sobre vendas e pedidos</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={alertaEstoqueBaixo} onChange={(e) => setAlertaEstoqueBaixo(e.target.checked)}
                  className="h-4 w-4 rounded border-input" />
                <div>
                  <p className="text-sm font-medium">Alerta de estoque baixo</p>
                  <p className="text-xs text-muted-foreground">Avisar quando um produto estiver com estoque baixo</p>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <Button type="submit" disabled={salvando}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  );
}