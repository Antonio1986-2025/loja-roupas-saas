"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload, Loader2, FileImage, FileText, X, CheckCircle2,
  AlertCircle, Plus, Trash2, Sparkles, PlusCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type DocumentoExtraido = {
  tipoDocumento: "NF" | "PEDIDO" | "ORCAMENTO" | "ROMANEIO" | "OUTRO";
  fornecedor: { nome: string | null; cnpj: string | null; telefone: string | null };
  numeroDocumento: string | null;
  dataEmissao: string | null;
  itens: {
    descricao: string;
    codigo: string | null;
    quantidade: number;
    unidade: string | null;
    precoUnitario: number;
    subtotal: number;
    cor: string | null;
    tamanho: string | null;
    marca: string | null;
  }[];
  valorTotal: number | null;
  valorFrete: number | null;
  observacoes: string | null;
};

type ArquivoItem = {
  file: File;
  preview: string | null; // base64 para imagens, null para PDF
};

type Props = {
  onConfirmar: (dados: DocumentoExtraido) => void;
  onCancelar: () => void;
};

export function UploadDocumentoEntrada({ onConfirmar, onCancelar }: Props) {
  const [arquivos, setArquivos] = useState<ArquivoItem[]>([]);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState<DocumentoExtraido | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const adicionarArquivos = (files: FileList | File[]) => {
    const novos: ArquivoItem[] = [];
    const erros: string[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        erros.push(`"${file.name}": formato inválido (use JPG, PNG ou PDF)`);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        erros.push(`"${file.name}": muito grande (máx 20MB)`);
        return;
      }

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setArquivos((prev) => [
            ...prev,
            { file, preview: e.target?.result as string },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        novos.push({ file, preview: null });
      }
    });

    if (novos.length > 0) {
      setArquivos((prev) => [...prev, ...novos]);
    }

    if (erros.length > 0) {
      setErro(erros.join("; "));
    } else {
      setErro("");
    }
    setDados(null);
  };

  const removerArquivo = (idx: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const processarDocumentos = async () => {
    if (arquivos.length === 0) return;
    setProcessando(true);
    setErro("");

    try {
      const formData = new FormData();
      arquivos.forEach((arq) => {
        formData.append("files", arq.file);
      });

      const res = await fetch("/api/entradas/parse-documento", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setErro(json.error || "Erro ao processar documentos");
        return;
      }

      setDados(json.dados);

      // Avisa se a IA extraiu o documento mas não encontrou itens
      if (!json.dados.itens || json.dados.itens.length === 0) {
        setErro(
          "⚠️ A IA leu o documento mas não encontrou produtos/itens. " +
          "Verifique se a imagem cobre a lista de produtos com valores. Você pode adicionar itens manualmente."
        );
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  };

  const atualizarItem = (idx: number, campo: string, valor: string | number) => {
    if (!dados) return;
    const novosItens = dados.itens.map((item, i) =>
      i === idx ? { ...item, [campo]: valor } : item
    );
    setDados({ ...dados, itens: novosItens });
  };

  const removerItem = (idx: number) => {
    if (!dados) return;
    setDados({ ...dados, itens: dados.itens.filter((_, i) => i !== idx) });
  };

  const adicionarItem = () => {
    if (!dados) return;
    setDados({
      ...dados,
      itens: [
        ...dados.itens,
        {
          descricao: "",
          codigo: null,
          quantidade: 1,
          unidade: "UN",
          precoUnitario: 0,
          subtotal: 0,
          cor: null,
          tamanho: null,
          marca: null,
        },
      ],
    });
  };

  const tipoLabel: Record<string, string> = {
    NF: "Nota Fiscal",
    PEDIDO: "Pedido de Compra",
    ORCAMENTO: "Orçamento",
    ROMANEIO: "Romaneio",
    OUTRO: "Outro Documento",
  };

  return (
    <div className="space-y-6">
      {/* Área de upload — visível sempre que não há resultado */}
      {!dados && (
        <div className="space-y-3">
          {/* Zona de drop */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              arquivos.length > 0
                ? "border-primary/50 bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length > 0) adicionarArquivos(e.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0)
                  adicionarArquivos(e.target.files);
                // reset para permitir selecionar o mesmo arquivo novamente
                e.target.value = "";
              }}
            />
            <div className="flex justify-center gap-3 mb-3">
              <FileImage className="h-10 w-10 text-muted-foreground/40" />
              <FileText className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-sm">Arraste ou clique para adicionar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Foto da nota, pedido, orçamento ou romaneio — várias páginas permitidas
            </p>
            <p className="text-xs text-muted-foreground">JPG, PNG ou PDF · até 20MB por arquivo</p>
            <div className="mt-3 text-left inline-block">
              <p className="text-xs text-muted-foreground font-medium mb-1">💡 Para melhores resultados:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-none">
                <li>✓ Foto reta, sem ângulo e bem iluminada</li>
                <li>✓ Documento deve estar totalmente visível</li>
                <li>✓ Evite reflexos e sombras sobre o texto</li>
                <li>✓ PDFs digitais funcionam melhor que fotos</li>
              </ul>
            </div>
          </div>

          {/* Lista de arquivos adicionados */}
          {arquivos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {arquivos.length} arquivo{arquivos.length > 1 ? "s" : ""} selecionado{arquivos.length > 1 ? "s" : ""}
              </p>
              {arquivos.map((arq, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
                >
                  {arq.preview ? (
                    <img
                      src={arq.preview}
                      alt={`Página ${idx + 1}`}
                      className="h-12 w-12 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{arq.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(arq.file.size / 1024).toFixed(0)} KB ·{" "}
                      {arq.file.type.startsWith("image/") ? "Imagem" : "PDF"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removerArquivo(idx); }}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Botão para adicionar mais */}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Adicionar mais páginas
              </button>
            </div>
          )}
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {erro}
        </div>
      )}

      {/* Botão processar */}
      {arquivos.length > 0 && !dados && (
        <Button
          type="button"
          className="w-full gap-2"
          size="lg"
          onClick={processarDocumentos}
          disabled={processando}
        >
          {processando ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analisando {arquivos.length} arquivo{arquivos.length > 1 ? "s" : ""} com IA...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Extrair informações com IA ({arquivos.length} arquivo{arquivos.length > 1 ? "s" : ""})
            </>
          )}
        </Button>
      )}

      {/* Resultado extraído */}
      {dados && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle2 className="h-5 w-5" />
            Documento analisado — revise e confirme os dados
          </div>

          {/* Cabeçalho do documento */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-medium text-sm">{tipoLabel[dados.tipoDocumento] ?? dados.tipoDocumento}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nº do Documento</Label>
                  <Input
                    className="h-8 text-sm"
                    value={dados.numeroDocumento ?? ""}
                    onChange={(e) => setDados({ ...dados, numeroDocumento: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data de Emissão</Label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    value={dados.dataEmissao ?? ""}
                    onChange={(e) => setDados({ ...dados, dataEmissao: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                  <Input
                    className="h-8 text-sm"
                    value={dados.fornecedor.nome ?? ""}
                    onChange={(e) =>
                      setDados({ ...dados, fornecedor: { ...dados.fornecedor, nome: e.target.value || null } })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CNPJ do Fornecedor</Label>
                  <Input
                    className="h-8 text-sm font-mono"
                    value={dados.fornecedor.cnpj ?? ""}
                    onChange={(e) =>
                      setDados({ ...dados, fornecedor: { ...dados.fornecedor, cnpj: e.target.value || null } })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Frete (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="h-8 text-sm"
                    value={dados.valorFrete ?? ""}
                    onChange={(e) => setDados({ ...dados, valorFrete: Number(e.target.value) || null })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Itens ({dados.itens.length})</h3>
              <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
              </Button>
            </div>

            <div className="space-y-3">
              {dados.itens.map((item, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-3 pb-3">
                    <div className="grid grid-cols-6 gap-2 items-end">
                      <div className="col-span-6 sm:col-span-3 space-y-1">
                        <Label className="text-xs text-muted-foreground">Descrição *</Label>
                        <Input
                          className="h-8 text-sm"
                          value={item.descricao}
                          onChange={(e) => atualizarItem(idx, "descricao", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
                          className="h-8 text-sm font-mono"
                          value={item.codigo ?? ""}
                          onChange={(e) => atualizarItem(idx, "codigo", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 text-sm"
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(idx, "quantidade", Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Preço Unit.</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="h-8 text-sm"
                          value={item.precoUnitario}
                          onChange={(e) => atualizarItem(idx, "precoUnitario", Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Cor</Label>
                        <Input
                          className="h-8 text-sm"
                          value={item.cor ?? ""}
                          placeholder="—"
                          onChange={(e) => atualizarItem(idx, "cor", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tamanho</Label>
                        <Input
                          className="h-8 text-sm"
                          value={item.tamanho ?? ""}
                          placeholder="—"
                          onChange={(e) => atualizarItem(idx, "tamanho", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Marca</Label>
                        <Input
                          className="h-8 text-sm"
                          value={item.marca ?? ""}
                          placeholder="—"
                          onChange={(e) => atualizarItem(idx, "marca", e.target.value)}
                        />
                      </div>
                      <div className="flex items-end justify-between col-span-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Subtotal: {formatCurrency(item.quantidade * item.precoUnitario)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removerItem(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="font-medium">Total calculado:</span>
            <span className="text-xl font-bold">
              {formatCurrency(
                dados.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0) +
                  (dados.valorFrete ?? 0)
              )}
            </span>
          </div>

          {/* Observações */}
          {dados.observacoes && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
              <span className="font-medium">Observações: </span>
              {dados.observacoes}
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDados(null);
                setArquivos([]);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Recomeçar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (dados.itens.length === 0) return;
                onConfirmar(dados);
              }}
              disabled={dados.itens.length === 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Usar esses dados
            </Button>
          </div>
        </div>
      )}

      {/* Cancelar */}
      {!dados && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
