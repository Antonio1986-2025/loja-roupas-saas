import { generateSlug } from "@/lib/utils";

/**
 * Calculos puros para o registro/onboarding de novas lojas (tenants).
 */

/**
 * A partir de um slug base e da lista de slugs ja existentes, retorna um slug
 * unico. Se houver colisao, adiciona sufixo numerico (-2, -3, ...).
 */
export function resolverSlugUnico(slugBase: string, slugsExistentes: string[]): string {
  const existentes = new Set(slugsExistentes);
  if (!existentes.has(slugBase)) return slugBase;
  let i = 2;
  while (existentes.has(`${slugBase}-${i}`)) i++;
  return `${slugBase}-${i}`;
}

/**
 * Gera um slug base a partir do nome da loja. Se o nome nao produzir nenhum
 * caractere valido, usa um fallback ("loja").
 */
export function gerarSlugBase(nomeLoja: string): string {
  const slug = generateSlug(nomeLoja);
  return slug.length > 0 ? slug : "loja";
}