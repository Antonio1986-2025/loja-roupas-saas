import prisma from "@/lib/prisma";
import type { CreateCategoriaInput, UpdateCategoriaInput } from "@/lib/validations/categoria";

export class CategoriaError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "CategoriaError";
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function listarCategorias(tenantId: string) {
  return prisma.categoria.findMany({
    where: { tenantId },
    include: { _count: { select: { produtos: true } } },
    orderBy: { nome: "asc" },
  });
}

export async function buscarCategoria(tenantId: string, id: string) {
  const categoria = await prisma.categoria.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { produtos: true } } },
  });

  if (!categoria) {
    throw new CategoriaError("NAO_ENCONTRADA", "Categoria não encontrada");
  }

  return categoria;
}

export async function criarCategoria(tenantId: string, data: CreateCategoriaInput) {
  const slug = slugify(data.nome);

  const existente = await prisma.categoria.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });

  if (existente) {
    throw new CategoriaError("SLUG_DUPLICADO", "Já existe uma categoria com este nome");
  }

  return prisma.categoria.create({
    data: { nome: data.nome, slug, tenantId },
  });
}

export async function atualizarCategoria(
  tenantId: string,
  id: string,
  data: UpdateCategoriaInput
) {
  const existente = await prisma.categoria.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new CategoriaError("NAO_ENCONTRADA", "Categoria não encontrada");
  }

  const slug = slugify(data.nome);
  const conflito = await prisma.categoria.findFirst({
    where: { tenantId, slug, id: { not: id } },
  });

  if (conflito) {
    throw new CategoriaError("SLUG_DUPLICADO", "Já existe outra categoria com este nome");
  }

  return prisma.categoria.update({
    where: { id },
    data: { nome: data.nome, slug },
  });
}

export async function excluirCategoria(tenantId: string, id: string) {
  const existente = await prisma.categoria.findFirst({
    where: { id, tenantId },
  });

  if (!existente) {
    throw new CategoriaError("NAO_ENCONTRADA", "Categoria não encontrada");
  }

  const produtosVinculados = await prisma.produto.count({
    where: { categoriaId: id },
  });

  if (produtosVinculados > 0) {
    throw new CategoriaError(
      "POSSUI_PRODUTOS",
      `Esta categoria possui ${produtosVinculados} produto(s) vinculado(s). Remova os vínculos antes de excluir.`
    );
  }

  await prisma.categoria.delete({ where: { id } });
}
