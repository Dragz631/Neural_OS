// Roadmap de uma matéria no estilo do roadmap.sh: uma espinha de etapas na ordem
// em que se aprende, e em cada etapa os assuntos de lado (essencial, opcional,
// ou "escolha um"). Quem cria é o professor; a Lousa só mostra.

export type TipoItem = 'essencial' | 'opcional' | 'alternativa';
export const TIPOS_ITEM: readonly TipoItem[] = ['essencial', 'opcional', 'alternativa'];

export interface ItemRoadmap {
  titulo: string;
  tipo: TipoItem;
  /** Entrou por causa de um slide novo do NotebookLM (selo "novo"). */
  novo?: boolean;
}

export interface EtapaRoadmap {
  titulo: string;
  /** Uma frase: por que esta etapa vem agora. */
  porque: string;
  itens: ItemRoadmap[];
  /** Etapa inteira nova (veio de slide novo). */
  nova?: boolean;
}

/** O que o professor quer acrescentar ao roadmap por causa dos slides novos. */
export interface Adaptacao {
  /** Itens novos dentro de etapas que já existem (pelo título da etapa). */
  acrescimos: { etapa: string; itens: ItemRoadmap[] }[];
  /** Etapas novas, e depois de qual etapa existente entram (vazio = no fim). */
  novasEtapas: (EtapaRoadmap & { depoisDe?: string })[];
}

/**
 * Junta a adaptação no roadmap SEM apagar nada: o que já existe fica igual (e o seu
 * progresso também, que é por tópico). O que entrou ganha o selo "novo".
 */
export function mesclarRoadmap(atual: Roadmap, a: Adaptacao): Roadmap {
  const etapas: EtapaRoadmap[] = atual.etapas.map((e) => ({ ...e, itens: [...e.itens] }));
  const jaTem = new Set(etapas.flatMap((e) => e.itens.map((i) => normalizar(i.titulo))));
  const acharEtapa = (titulo?: string) => (titulo ? etapas.findIndex((e) => normalizar(e.titulo) === normalizar(titulo)) : -1);

  for (const ac of a.acrescimos) {
    const i = acharEtapa(ac.etapa);
    if (i < 0) continue;
    for (const it of ac.itens) {
      if (jaTem.has(normalizar(it.titulo)) || etapas[i].itens.length >= MAX_ITENS + 3) continue;
      etapas[i].itens.push({ ...it, novo: true });
      jaTem.add(normalizar(it.titulo));
    }
  }
  for (const nova of a.novasEtapas) {
    if (acharEtapa(nova.titulo) >= 0 || etapas.length >= MAX_ETAPAS + 4) continue;
    const itens = nova.itens.filter((it) => !jaTem.has(normalizar(it.titulo))).map((it) => ({ ...it, novo: true }));
    if (!itens.length) continue;
    itens.forEach((it) => jaTem.add(normalizar(it.titulo)));
    const depois = acharEtapa(nova.depoisDe);
    const etapa: EtapaRoadmap = { titulo: nova.titulo, porque: nova.porque, itens, nova: true };
    if (depois >= 0) etapas.splice(depois + 1, 0, etapa);
    else etapas.push(etapa);
  }
  return { ...atual, etapas };
}

/** Lê a adaptação que a IA mandou (tolerante: ignora o que vier torto). */
export function validarAdaptacao(bruto: unknown): Adaptacao {
  const o = (bruto ?? {}) as Record<string, unknown>;
  const itensDe = (lista: unknown): ItemRoadmap[] =>
    (Array.isArray(lista) ? lista : []).slice(0, MAX_ITENS).flatMap((i) => {
      const it = typeof i === 'string' ? { titulo: i } : ((i ?? {}) as Record<string, unknown>);
      const t = texto(it.titulo, 48);
      return t ? [{ titulo: t, tipo: TIPOS_ITEM.includes(it.tipo as TipoItem) ? (it.tipo as TipoItem) : 'essencial' }] : [];
    });
  const acrescimos = (Array.isArray(o.acrescimos) ? o.acrescimos : []).slice(0, 10).flatMap((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
    const etapa = texto(r.etapa, 48);
    const itens = itensDe(r.itens);
    return etapa && itens.length ? [{ etapa, itens }] : [];
  });
  const novasEtapas = (Array.isArray(o.novasEtapas) ? o.novasEtapas : []).slice(0, 4).flatMap((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
    const titulo = texto(r.titulo, 48);
    const itens = itensDe(r.itens);
    return titulo && itens.length ? [{ titulo, porque: texto(r.porque, 140), itens, depoisDe: texto(r.depoisDe, 48) || undefined }] : [];
  });
  return { acrescimos, novasEtapas };
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
