// ============================================
// Utilitário de resolução de código IBGE de município
// Usado para preencher corretamente o <cMun> do destinatário
// na NF-e (era hardcoded para Campo Grande antes desta correção)
// ============================================

interface MunicipioIBGE {
  id: number;
  nome: string;
}

// Cache em memória por UF (a lista de municípios praticamente nunca muda)
const cacheMunicipiosPorUf = new Map<string, MunicipioIBGE[]>();

function normalizar(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

async function fetchMunicipios(uf: string): Promise<MunicipioIBGE[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`IBGE API respondeu ${res.status}`);
    const data = (await res.json()) as MunicipioIBGE[];
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolve o código IBGE (7 dígitos) de um município a partir do nome + UF.
 * Retorna null se não encontrar ou se a API do IBGE estiver indisponível
 * (quem chama deve ter um fallback nesse caso).
 */
export async function getIbgeCodigoCidade(
  uf: string,
  cidade: string
): Promise<string | null> {
  if (!uf || !cidade) return null;
  const ufNorm = uf.trim().toUpperCase();

  try {
    let municipios = cacheMunicipiosPorUf.get(ufNorm);
    if (!municipios) {
      municipios = await fetchMunicipios(ufNorm);
      cacheMunicipiosPorUf.set(ufNorm, municipios);
    }

    const cidadeNorm = normalizar(cidade);
    const match = municipios.find((m) => normalizar(m.nome) === cidadeNorm);
    return match ? String(match.id) : null;
  } catch (err) {
    console.warn(`[IBGE] Falha ao resolver código do município "${cidade}/${uf}":`, (err as Error).message);
    return null;
  }
}
