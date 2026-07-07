/**
 * Utilitarios para lidar com URLs de imagens do Google Drive.
 *
 * O formato "uc?export=view" e pesado e o Google bloqueia (rate-limit) quando
 * muitas imagens sao carregadas de uma vez. O formato do CDN "lh3.googleusercontent.com/d/ID"
 * e confiavel para exibir em tags <img> e ja entrega a imagem redimensionada.
 */

/** Extrai o ID do arquivo de qualquer formato conhecido de URL do Google Drive. */
export function extrairIdGoogleDrive(url: string | null | undefined): string | null {
  if (!url) return null;

  // formato ?id=XXXX ou &id=XXXX (ex: uc?export=view&id=XXXX)
  let m = url.match(/[?&]id=([^&]+)/);
  if (m) return m[1];

  // formato /file/d/XXXX/
  m = url.match(/\/file\/d\/([^/]+)/);
  if (m) return m[1];

  // formato /d/XXXX (ex: lh3.googleusercontent.com/d/XXXX)
  m = url.match(/\/d\/([^=/?]+)/);
  if (m) return m[1];

  return null;
}

/**
 * Converte uma URL do Google Drive para o formato CDN (lh3) redimensionado.
 * Se nao for possivel extrair um ID valido, retorna a URL original.
 */
export function converterUrlGoogleDrive(
  url: string | null | undefined,
  largura = 800
): string | null {
  if (!url) return null;
  const id = extrairIdGoogleDrive(url);
  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}=w${largura}`;
  }
  return url;
}

/**
 * Retorna a URL da foto no tamanho certo para cada contexto:
 * - "thumb"  → w200  (listas, cards, PDV, condicional) ~12KB
 * - "medium" → w400  (grids maiores, banners)          ~45KB
 * - "full"   → w800  (detalhe do produto)              ~150KB
 *
 * Para URLs que nao sao do Google Drive (ex: upload local /fotos/*.webp),
 * retorna a URL original sem modificacao.
 */
export type TamanhoFoto = "thumb" | "medium" | "full";

const LARGURAS: Record<TamanhoFoto, number> = {
  thumb: 200,
  medium: 400,
  full: 800,
};

export function fotoUrl(
  url: string | null | undefined,
  tamanho: TamanhoFoto = "thumb"
): string | null {
  if (!url) return null;
  const id = extrairIdGoogleDrive(url);
  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}=w${LARGURAS[tamanho]}`;
  }
  // URL local (/fotos/*.webp) ou externa desconhecida — retorna sem modificar
  return url;
}