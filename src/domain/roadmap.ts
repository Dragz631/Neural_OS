// Roadmap de uma matéria no estilo do roadmap.sh: uma espinha de etapas na ordem
// em que se aprende, e em cada etapa os assuntos de lado (essencial, opcional,
// ou "escolha um"). Quem cria é o professor; a Lousa só mostra.

export type TipoItem = 'essencial' | 'opcional' | 'alternativa';
export const TIPOS_ITEM: readonly TipoItem[] = ['essencial', 'opcional', 'alternativa'];

export interface ItemRoadmap {
  titulo: string;
  tipo: TipoItem;
}

export interface EtapaRoadmap {
  titulo: string;
  /** Uma frase: por que esta etapa vem agora. */
  porque: string;
  itens: ItemRoadmap[];
}

export interface Roadmap {
  materia: string;
  objetivo?: string;
  etapas: EtapaRoadmap[];
}

const MAX_ETAPAS = 14;
const MAX_ITENS = 7;

const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Confere e conserta o que vier da IA. Lança erro se não dá pra montar um roadmap. */
export function validarRoadmap(bruto: unknown, materia: string): Roadmap {
  const o = (bruto ?? {}) as Record<string, unknown>;
  const etapas: EtapaRoadmap[] = [];
  for (const e of (Array.isArray(o.etapas) ? o.etapas : []).slice(0, MAX_ETAPAS)) {
    const r = (e ?? {}) as Record<string, unknown>;
    const titulo = texto(r.titulo, 48);
    if (!titulo) continue;
    const itens: ItemRoadmap[] = [];
    for (const i of (Array.isArray(r.itens) ? r.itens : []).slice(0, MAX_ITENS)) {
      const it = typeof i === 'string' ? { titulo: i } : ((i ?? {}) as Record<string, unknown>);
      const t = texto(it.titulo, 48);
      if (!t) continue;
      const tipo = TIPOS_ITEM.includes(it.tipo as TipoItem) ? (it.tipo as TipoItem) : 'essencial';
      itens.push({ titulo: t, tipo });
    }
    etapas.push({ titulo, porque: texto(r.porque, 140), itens });
  }
  if (etapas.length < 3) throw new Error('o roadmap veio com etapas de menos');
  return { materia, objetivo: texto(o.objetivo, 140) || undefined, etapas };
}

export const normalizar = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Acha o tópico já existente que corresponde a um item do roadmap (mesmo título, sem acento/caixa). */
export function acharTopico<T extends { title: string }>(topicos: T[], titulo: string): T | undefined {
  const alvo = normalizar(titulo);
  return topicos.find((t) => normalizar(t.title) === alvo);
}
