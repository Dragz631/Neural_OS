// A "cena" do quadro: o professor escolhe COMO explicar (fluxo, estados, passos,
// comparação, mapa, linha do tempo...) e o código só faz o desenho. O professor
// nunca dá coordenada: dá linha e coluna de uma grade pequena; o resto é cálculo.

import { lerDiagrama, TIPOS_DIAGRAMA, type Diagrama, type TipoDiagrama } from './diagramas';
import { compilarExpressao } from './expressao';

export const ESTILOS_CENA = ['fluxo', 'estados', 'passos', 'comparar', 'mapa', 'camadas', 'linha-do-tempo', 'livre'] as const;
export type EstiloCena = (typeof ESTILOS_CENA)[number];

export const TIPOS_CENA = ['caixa', 'losango', 'estado', 'estado-final', 'nota', 'texto', 'formula', 'destaque', 'grafico', 'arvore', 'conjuntos', 'grade', 'tabela'] as const;
export type TipoCena = (typeof TIPOS_CENA)[number];

/** O papel decide a cor: a pessoa aprende a "ler" o quadro pela cor. */
export const PAPEIS_CENA = ['conceito', 'exemplo', 'erro', 'dica', 'resultado', 'passo', 'entrada', 'saida', 'neutro'] as const;
export type PapelCena = (typeof PAPEIS_CENA)[number];

/**
 * Plano cartesiano estilo Desmos: o professor escolhe a janela e escreve as funções
 * ("y = x^2 - 4", "sin(x)", "x = 3") e os pontos; o código calcula e desenha.
 */
export interface FuncaoGrafico {
  expr: string;
  rotulo?: string;
  papel?: PapelCena;
  tracejada?: boolean;
}
export interface PontoGrafico {
  x: number;
  y: number;
  rotulo?: string;
  papel?: PapelCena;
}
export interface Grafico {
  xmin: number;
  xmax: number;
  /** Sem janela vertical: o desenho calcula a partir das funções. */
  ymin?: number;
  ymax?: number;
  funcoes: FuncaoGrafico[];
  pontos: PontoGrafico[];
}

export interface ElementoCena {
  id: string;
  tipo: TipoCena;
  texto: string;
  papel: PapelCena;
  linha?: number;
  coluna?: number;
  /** Só quando tipo = "grafico". */
  grafico?: Grafico;
  /** Só quando tipo = arvore | conjuntos | grade | tabela. */
  diagrama?: Diagrama;
}

export interface LigacaoCena {
  de: string;
  para: string;
  rotulo?: string;
  tracejada?: boolean;
}

/** Comentário do professor ao lado de um elemento (o "olha aqui" do giz). */
export interface AnotacaoCena {
  texto: string;
  em: string;
}

export interface Cena {
  estilo: EstiloCena;
  /** Por que o professor escolheu desenhar assim (uma frase). */
  porque: string;
  elementos: ElementoCena[];
  ligacoes: LigacaoCena[];
  anotacoes: AnotacaoCena[];
}

const MAX_ELEMENTOS = 16;
const MAX_TEXTO = 140;

const noArray = <T extends string>(lista: readonly T[], v: unknown, padrao: T): T => (lista.includes(v as T) ? (v as T) : padrao);
const nat = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 8 ? Math.round(v) : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e6 ? v : undefined);

/** Lê o gráfico do professor; null se não sobrou nada pra desenhar. */
function lerGrafico(bruto: unknown): Grafico | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const g = bruto as Record<string, unknown>;
  const funcoes: FuncaoGrafico[] = [];
  for (const f of (Array.isArray(g.funcoes) ? g.funcoes : []).slice(0, 4)) {
    const o = typeof f === 'string' ? { expr: f } : (f as Record<string, unknown> | null);
    if (!o || typeof o.expr !== 'string' || !compilarExpressao(o.expr)) continue; // não entendeu a conta: ignora em vez de desenhar errado
    funcoes.push({
      expr: o.expr.trim().slice(0, 120),
      rotulo: typeof o.rotulo === 'string' && o.rotulo.trim() ? o.rotulo.trim().slice(0, 40) : undefined,
      papel: o.papel ? noArray(PAPEIS_CENA, o.papel, 'conceito') : undefined,
      tracejada: o.tracejada === true || o.estilo === 'tracejada',
    });
  }
  const pontos: PontoGrafico[] = [];
  for (const p of (Array.isArray(g.pontos) ? g.pontos : []).slice(0, 8)) {
    const o = (p ?? {}) as Record<string, unknown>;
    const x = num(o.x);
    const y = num(o.y);
    if (x === undefined || y === undefined) continue;
    pontos.push({ x, y, rotulo: typeof o.rotulo === 'string' && o.rotulo.trim() ? o.rotulo.trim().slice(0, 24) : undefined, papel: o.papel ? noArray(PAPEIS_CENA, o.papel, 'resultado') : undefined });
  }
  if (funcoes.length === 0 && pontos.length === 0) return null;
  let xmin = num(g.xmin) ?? -6;
  let xmax = num(g.xmax) ?? 6;
  if (!(xmin < xmax)) [xmin, xmax] = [-6, 6];
  let ymin = num(g.ymin);
  let ymax = num(g.ymax);
  if (ymin === undefined || ymax === undefined || !(ymin < ymax)) ymin = ymax = undefined;
  return { xmin, xmax, ymin, ymax, funcoes, pontos };
}

// Sinais de que a aula trabalha mesmo com algo num plano (função, equação, pontos).
const SINAL_DE_PLANO = /fun[cç][aã]o|f\(x\)|\by\s*=|\bx\s*=|equa[cç][aã]o|par[aá]bola|\breta\b|plano cartesiano|eixo|coordenada|\bgr[aá]fico|seno|cosseno|logaritmo|expoencial|exponencial|derivada|integral|limite|\bx\^|x²|x\*\*/i;

/**
 * Tira os gráficos de uma cena quando a aula não fala de nada que se desenhe num plano
 * (ex.: paradigma de programação com um plano cartesiano do lado). Prompt pede, o código garante.
 */
export function semGraficoFora(cena: Cena, textoDaAula: string): Cena {
  const eMatematica = SINAL_DE_PLANO.test(textoDaAula);
  const fora = new Set<string>();
  const elementos: ElementoCena[] = [];
  for (const el of cena.elementos) {
    if (el.tipo !== 'grafico') {
      elementos.push(el);
      continue;
    }
    if (!eMatematica || !el.grafico) {
      fora.add(el.id);
      continue;
    }
    elementos.push({ ...el, grafico: { ...el.grafico, funcoes: el.grafico.funcoes.slice(0, 2) } });
  }
  if (fora.size === 0 && elementos.length === cena.elementos.length) return { ...cena, elementos };
  return {
    ...cena,
    elementos,
    ligacoes: cena.ligacoes.filter((l) => !fora.has(l.de) && !fora.has(l.para)),
    anotacoes: cena.anotacoes.filter((a) => !fora.has(a.em)),
  };
}

/** Aceita o JSON do professor e devolve uma cena segura, ou null se não dá pra desenhar nada. */
export function lerCena(bruto: unknown): Cena | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const o = bruto as Record<string, unknown>;
  const lista = Array.isArray(o.elementos) ? o.elementos : [];
  const ids = new Set<string>();
  const elementos: ElementoCena[] = [];
  for (const x of lista.slice(0, MAX_ELEMENTOS)) {
    if (!x || typeof x !== 'object') continue;
    const e = x as Record<string, unknown>;
    const ehGrafico = e.tipo === 'grafico';
    const grafico = ehGrafico ? lerGrafico(e.grafico) : null;
    if (ehGrafico && !grafico) continue;
    const ehDiagrama = TIPOS_DIAGRAMA.includes(e.tipo as TipoDiagrama);
    const diagrama = ehDiagrama ? lerDiagrama(e.tipo as TipoDiagrama, e[e.tipo as string] ?? e.dados) : null;
    if (ehDiagrama && !diagrama) continue; // dado quebrado: some o diagrama, não o desenho inteiro
    const texto = typeof e.texto === 'string' ? e.texto.trim().slice(0, MAX_TEXTO) : ehGrafico || ehDiagrama ? ' ' : '';
    if (!texto) continue;
    let id = typeof e.id === 'string' && e.id.trim() ? e.id.trim() : `e${elementos.length}`;
    if (ids.has(id)) id = `${id}-${elementos.length}`;
    ids.add(id);
    elementos.push({ id, tipo: noArray(TIPOS_CENA, e.tipo, 'caixa'), texto, papel: noArray(PAPEIS_CENA, e.papel, 'neutro'), linha: nat(e.linha), coluna: nat(e.coluna), ...(grafico ? { grafico } : {}), ...(diagrama ? { diagrama } : {}) });
  }
  // Um diagrama sozinho já é um desenho; caixas soltas precisam de pelo menos duas.
  if (elementos.length < 2 && !elementos.some((el) => el.grafico || el.diagrama)) return null;
  const ligacoes: LigacaoCena[] = [];
  for (const x of Array.isArray(o.ligacoes) ? o.ligacoes : []) {
    if (!x || typeof x !== 'object') continue;
    const l = x as Record<string, unknown>;
    if (typeof l.de !== 'string' || typeof l.para !== 'string' || l.de === l.para || !ids.has(l.de) || !ids.has(l.para)) continue;
    ligacoes.push({ de: l.de, para: l.para, rotulo: typeof l.rotulo === 'string' && l.rotulo.trim() ? l.rotulo.trim().slice(0, 40) : undefined, tracejada: l.estilo === 'tracejada' || l.tracejada === true });
  }
  const anotacoes: AnotacaoCena[] = [];
  for (const x of Array.isArray(o.anotacoes) ? o.anotacoes : []) {
    if (!x || typeof x !== 'object') continue;
    const a = x as Record<string, unknown>;
    if (typeof a.texto === 'string' && a.texto.trim() && typeof a.em === 'string' && ids.has(a.em)) anotacoes.push({ texto: a.texto.trim().slice(0, MAX_TEXTO), em: a.em });
  }
  return {
    estilo: noArray(ESTILOS_CENA, o.estilo, 'livre'),
    porque: typeof o.porque === 'string' ? o.porque.trim().slice(0, 200) : '',
    elementos,
    ligacoes,
    anotacoes: anotacoes.slice(0, 4),
  };
}

/**
 * Completa linha/coluna quando o professor não deu (ou deu repetido).
 * fluxo/passos/linha do tempo: tudo em coluna (de cima pra baixo); o resto: grade de até 3 por linha.
 */
export function posicionar(cena: Cena): { el: ElementoCena; linha: number; coluna: number }[] {
  const vertical = cena.estilo === 'fluxo' || cena.estilo === 'passos' || cena.estilo === 'camadas';
  const ocupadas = new Set<string>();
  const dados = cena.elementos.every((e) => e.linha !== undefined && e.coluna !== undefined);
  return cena.elementos.map((el, i) => {
    let linha = vertical ? i : Math.floor(i / 3);
    let coluna = vertical ? 0 : i % 3;
    if (dados) {
      linha = el.linha!;
      coluna = el.coluna!;
      // Dois elementos na mesma casa: o segundo desce uma linha.
      while (ocupadas.has(`${linha}:${coluna}`)) linha += 1;
    }
    ocupadas.add(`${linha}:${coluna}`);
    return { el, linha, coluna };
  });
}
