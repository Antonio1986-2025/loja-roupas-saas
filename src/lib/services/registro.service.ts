import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { RegistroInput } from "@/lib/validations/registro";
import { gerarSlugBase, resolverSlugUnico } from "@/lib/calculations/registro";

export class RegistroError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "RegistroError";
  }
}

/**
 * Registra uma nova loja (tenant) com seu usuario administrador.
 * Tudo numa transacao: ou cria loja + admin + configuracao, ou nada.
 */
export async function registrarLoja(data: RegistroInput) {
  const email = data.email.trim().toLowerCase();

  // 1. Email ja usado?
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    throw new RegistroError(
      "EMAIL_EM_USO",
      "Este email já está cadastrado. Tente fazer login."
    );
  }

  // 2. Slug unico para a loja
  const slugBase = gerarSlugBase(data.nomeLoja);
  const lojasComSlugParecido = await prisma.tenant.findMany({
    where: { slug: { startsWith: slugBase } },
    select: { slug: true },
  });
  const slug = resolverSlugUnico(
    slugBase,
    lojasComSlugParecido.map((t) => t.slug)
  );

  const senhaHash = await bcrypt.hash(data.senha, 10);

  // 3. Criar loja + admin + configuracao
  const resultado = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: data.nomeLoja.trim(),
        slug,
        plan: "FREE",
        status: "ACTIVE",
      },
    });

    const usuario = await tx.user.create({
      data: {
        email,
        password: senhaHash,
        name: data.nomeResponsavel.trim(),
        role: "ADMIN",
        tenantId: tenant.id,
      },
    });

    await tx.configuracao.create({
      data: {
        tenantId: tenant.id,
        nomeEmpresa: data.nomeLoja.trim(),
        email,
      },
    });

    return { tenant, usuario };
  });

  return {
    tenantId: resultado.tenant.id,
    slug: resultado.tenant.slug,
    email: resultado.usuario.email,
  };
}