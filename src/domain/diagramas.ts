// Diagramas que o professor pode pôr no quadro além de caixas e setas. Servem pra
// qualquer matéria: árvore (probabilidade, hierarquia, classificação, decisão),
// conjuntos (Venn: o que é comum, o que é só de um), grade (espaço amostral, matriz,
// tabuleiro) e tabela (comparar em linhas e colunas). O professor dá os DADOS; o
// tamanho e as posições são calculados aqui (ele nunca dá coordenada).

import type { PapelCena } from './cena';

export interface NoArvore {
  texto: string;
  /** Texto no galho que chega neste nó (ex.: "1/2", "se sim", "herda de"). */
  chance?: string;
  papel?: PapelCena;
  filhos: NoArvore[];
}
export interface Arvore {
  raiz: NoArvore;
}

export interface Conjunto {
  nome: string;
  itens: string[];
}
export interface Conjuntos {
  conjuntos: Conjunto[];
  /** Nome do universo (o retângulo em volta), ex.: "Ω = faces do dado". */
  universo?: string;
  /** Itens que não estão em nenhum conjunto. */
  fora: string[];
}

export interface GradeDiagrama {
  linhas: number;
  colunas: number;
  rotulosLinhas?: string[];
  rotulosColunas?: string[];
  /** Texto de cada célula (opcional), linha por linha. */
  celulas?: string[][];
  /** Células em destaque [linha, coluna] (base 0): ex. "soma = 7". */
  destaque: [number, number][];
}

export interface Tabela {
  cabecalho: string[];
  linhas: string[][];
}

export type Diagrama = { tipo: 'arvore'; dados: Arvore } | { tipo: 'conjuntos'; dados: Conjuntos } | { tipo: 'grade'; dados: GradeDiagrama } | { tipo: 'tabela'; dados: Tabela };
export type TipoDiagrama = Diagrama['tipo'];
export const TIPOS_DIAGRAMA: readonly TipoDiagrama[] = ['arvore', 'conjuntos', 'grade', 'tabela'];

const txt = (v: unknown, max: number): string => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, max) : '');
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const inteiro = (v: unknown, min: number, max: number): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : undefined);

const MAX_NOS = 24;

function lerNo(bruto: unknown, nivel: number, conta: { n: number }): NoArvore | null {
  if (conta.n >= MAX_NOS) return null;
  const o = typeof bruto === 'string' ? { texto: bruto } : ((bruto ?? {}) as Record<string, unknown>);
  const texto = txt(o.texto ?? o.nome ?? o.rotulo, 40);
  if (!texto) return null;
  conta.n++;
  const filhos: NoArvore[] = [];
  if (nivel < 4) {
    for (const f of lista(o.filhos).slice(0, 4)) {
      const no = lerNo(f, nivel + 1, conta);
      if (no) filhos.push(no);
    }
  }
  return { texto, chance: txt(o.chance ?? o.galho, 16) || undefined, filhos };
}

function lerArvore(b: Record<string, unknown>): Arvore | null {
  // Aceita {"raiz":"texto","filhos":[...]} ou {"raiz":{"texto":..,"filhos":[...]}}.
  const raizBruta = typeof b.raiz === 'string' ? { texto: b.raiz, filhos: b.filhos } : (b.raiz ?? b);
  const raiz = lerNo(raizBruta, 0, { n: 0 });
  return raiz && raiz.filhos.length > 0 ? { raiz } : null;
}

function lerConjuntos(b: Record<string, unknown>): Conjuntos | null {
  const conjuntos: Conjunto[] = [];
  for (const c of lista(b.conjuntos).slice(0, 3)) {
    const o = (c ?? {}) as Record<string, unknown>;
    const nome = txt(o.nome, 28);
    if (!nome) continue;
    conjuntos.push({ nome, itens: lista(o.itens).map((i) => txt(i, 14)).filter(Boolean).slice(0, 10) });
  }
  if (conjuntos.length < 2) return null;
  return { conjuntos, universo: txt(b.universo, 40) || undefined, fora: lista(b.fora).map((i) => txt(i, 14)).filter(Boolean).slice(0, 6) };
}

function lerGrade(b: Record<string, unknown>): GradeDiagrama | null {
  const celulas = lista(b.celulas).slice(0, 10).map((l) => lista(l).slice(0, 10).map((c) => txt(c, 5)));
  const linhas = inteiro(b.linhas, 1, 10) ?? (celulas.length || undefined);
  const colunas = inteiro(b.colunas, 1, 10) ?? (celulas[0]?.length || undefined);
  if (!linhas || !colunas || linhas * colunas < 2) return null;
  const destaque = lista(b.destaque)
    .map((d) => (Array.isArray(d) ? [inteiro(d[0], 0, 9), inteiro(d[1], 0, 9)] : [undefined, undefined]))
    .filter((d): d is [number, number] => d[0] !== undefined && d[1] !== undefined && d[0] < linhas && d[1] < colunas)
    .slice(0, 100);
  const rot = (v: unknown, n: number) => {
    const r = lista(v).map((x) => txt(x, 6)).slice(0, n);
    return r.length ? r : undefined;
  };
  return { linhas, colunas, rotulosLinhas: rot(b.rotulosLinhas, linhas), rotulosColunas: rot(b.rotulosColunas, colunas), celulas: celulas.length ? celulas : undefined, destaque };
}

function lerTabela(b: Record<string, unknown>): Tabela | null {
  const cabecalho = lista(b.cabecalho).map((c) => txt(c, 24)).slice(0, 6);
  const linhas = lista(b.linhas)
    .slice(0, 8)
    .map((l) => lista(l).map((c) => txt(c, 30)).slice(0, Math.max(cabecalho.length, 1)));
  const colunas = Math.max(cabecalho.length, ...linhas.map((l) => l.length));
  if (colunas < 2 || linhas.length < 1) return null;
  return { cabecalho, linhas };
}

/** Lê os dados do diagrama que veio da IA (no campo do mesmo nome do tipo, ou em "dados"). */
export function lerDiagrama(tipo: TipoDiagrama, bruto: unknown): Diagrama | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const b = bruto as Record<string, unknown>;
  switch (tipo) {
    case 'arvore': {
      const d = lerArvore(b);
      return d && { tipo, dados: d };
    }
    case 'conjuntos': {
      const d = lerConjuntos(b);
      return d && { tipo, dados: d };
    }
    case 'grade': {
      const d = lerGrade(b);
      return d && { tipo, dados: d };
    }
    case 'tabela': {
      const d = lerTabela(b);
      return d && { tipo, dados: d };
    }
  }
}

// ── Medidas (o quadro precisa saber o tamanho antes de posicionar) ───────────

export const ARVORE = { colW: 200, noW: 160, noH: 44, folhaH: 60 };
export const GRADE_CEL = 38;

export function folhas(no: NoArvore): number {
  return no.filhos.length ? no.filhos.reduce((s, f) => s + folhas(f), 0) : 1;
}
export function profundidade(no: NoArvore): number {
  return 1 + (no.filhos.length ? Math.max(...no.filhos.map(profundidade)) : 0);
}

export const larguraColunaTabela = (t: Tabela, c: number) => Math.min(220, Math.max(70, ...[t.cabecalho[c] ?? '', ...t.linhas.map((l) => l[c] ?? '')].map((s) => s.length * 9 + 24)));

/** Tamanho do diagrama (sem o título, que fica 26 px acima). */
export function tamanhoDiagrama(d: Diagrama): { w: number; h: number } {
  switch (d.tipo) {
    case 'arvore':
      return { w: profundidade(d.dados.raiz) * ARVORE.colW, h: folhas(d.dados.raiz) * ARVORE.folhaH + 26 };
    case 'conjuntos':
      return { w: d.dados.conjuntos.length === 3 ? 480 : 500, h: (d.dados.conjuntos.length === 3 ? 420 : 300) + 26 };
    case 'grade': {
      const g = d.dados;
      return { w: (g.colunas + (g.rotulosLinhas ? 1 : 0)) * GRADE_CEL + 4, h: (g.linhas + (g.rotulosColunas ? 1 : 0)) * GRADE_CEL + 30 };
    }
    case 'tabela': {
      const t = d.dados;
      const cols = Math.max(t.cabecalho.length, ...t.linhas.map((l) => l.length));
      let w = 0;
      for (let c = 0; c < cols; c++) w += larguraColunaTabela(t, c);
      return { w, h: (t.linhas.length + (t.cabecalho.length ? 1 : 0)) * 36 + 30 };
    }
  }
}
