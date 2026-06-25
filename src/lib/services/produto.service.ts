import prisma from "@/lib/prisma";
import type { CreateProdutoInput, UpdateProdutoInput, VarianteInput } from "@/lib/validations/produto";
import type { Genero } from "@prisma/client";

export class ProdutoError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ProdutoError";
  }
}

export async function listarProdutos(tenantId: string) {
  return prisma.produto.findMany({
    where: { tenantId },
    include: {
      categoria: true,
      variantes: {
        select: {
          id: true,
          cor: true,
          tamanho: true,
          qtdEstoque: true,
          qtdDisponivel: true,
          precoVenda: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function buscarProduto(tenantId: string, id: string) {
  const produto = await prisma.produto.findFirst({
    where: { id, tenantId },
    include: {
      categoria: true,
      fornecedor: true,
      variantes: {
        orderBy: [{ cor: "asc" }, { tamanho: "asc" }],
      },
    },
  });

  if (!produto) {
    throw new ProdutoError("NAO_ENCONTRADO", "Produto não encontrado");
  }

  return produto;
}

export async function criarProduto(tenantId: string, data: CreateProdutoInput) {
  return prisma.$transaction(async (tx) => {
    const produto = await tx.produto.create({
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
        codigoInterno: data.codigoInterno || null,
        codigoFornecedor: data.codigoFornecedor || null,
        marca: data.marca || null,
        genero: (data.genero as Genero) || null,
        precoVenda: parseFloat(data.precoVenda),
        precoCusto: data.precoCusto ? parseFloat(data.precoCusto) : null,
        fotoUrl: data.fotoUrl || null,
        ativo: data.ativo ?? true,
        categoriaId: data.categoriaId || null,
        fornecedorId: data.fornecedorId || null,
        tenantId,
      },
    });

    for (const v of data.variantes) {
      await tx.produtoVariante.create({
        data: {
          produtoId: produto.id,
          cor: v.cor || null,
          tamanho: v.tamanho || null,
          codigoBarras: v.codigoBarras,
          codigoInterno: v.codigoInterno || null,
          codigoFornecedor: v.codigoFornecedor || null,
          precoVenda: v.precoVenda ? parseFloat(v.precoVenda) : null,
          estoqueMinimo: v.estoqueMinimo ? parseInt(v.estoqueMinimo) : 0,
          qtdEstoque: v.qtdEstoque ? parseInt(v.qtdEstoque) : 0,
          qtdDisponivel: v.qtdEstoque ? parseInt(v.qtdEstoque) : 0,
        },
      });
    }

    return tx.produto.findUnique({
      where: { id: produto.id },
      include: { variantes: true },
    });
  });
}

export async function atualizarProduto(
  tenantId: string,
  id: string,
  data: UpdateProdutoInput
) {
  const existente = await prisma.produto.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new ProdutoError("NAO_ENCONTRADO", "Produto não encontrado");
  }

  return prisma.$transaction(async (tx) => {
    const produto = await tx.produto.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
        codigoInterno: data.codigoInterno || null,
        codigoFornecedor: data.codigoFornecedor || null,
        marca: data.marca || null,
        genero: (data.genero as Genero) || null,
        precoVenda: parseFloat(data.precoVenda),
        precoCusto: data.precoCusto ? parseFloat(data.precoCusto) : null,
        fotoUrl: data.fotoUrl || null,
        ativo: data.ativo ?? true,
        categoriaId: data.categoriaId || null,
        fornecedorId: data.fornecedorId || null,
      },
    });

    const variantesEnviadas = data.variantes.filter((v): v is VarianteInput & { id: string } => !!v.id);
    const idsEnviados = variantesEnviadas.map((v) => v.id);

    await tx.produtoVariante.deleteMany({
      where: { produtoId: id, id: { notIn: idsEnviados } },
    });

    for (const v of data.variantes) {
      const qtdEstoque = v.qtdEstoque ? parseInt(v.qtdEstoque) : 0;
      const dados = {
        cor: v.cor || null,
        tamanho: v.tamanho || null,
        codigoBarras: v.codigoBarras,
        codigoInterno: v.codigoInterno || null,
        codigoFornecedor: v.codigoFornecedor || null,
        precoVenda: v.precoVenda ? parseFloat(v.precoVenda) : null,
        estoqueMinimo: v.estoqueMinimo ? parseInt(v.estoqueMinimo) : 0,
        qtdEstoque,
        qtdDisponivel: qtdEstoque,
      };

      if (v.id) {
        await tx.produtoVariante.update({ where: { id: v.id }, data: dados });
      } else {
        await tx.produtoVariante.create({ data: { ...dados, produtoId: id } });
      }
    }

    return tx.produto.findUnique({
      where: { id },
      include: { variantes: true },
    });
  });
}

export async function excluirProduto(tenantId: string, id: string) {
  const existente = await prisma.produto.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new ProdutoError("NAO_ENCONTRADO", "Produto não encontrado");
  }

  await prisma.produto.delete({ where: { id } });
}
