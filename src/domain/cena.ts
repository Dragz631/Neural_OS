// A "cena" do quadro: o professor escolhe COMO explicar (fluxo, estados, passos,
// comparação, mapa, linha do tempo...) e o código só faz o desenho. O professor
// nunca dá coordenada: dá linha e coluna de uma grade pequena; o resto é cálculo.

export const ESTILOS_CENA = ['fluxo', 'estados', 'passos', 'comparar', 'mapa', 'camadas', 'linha-do-tempo', 'livre'] as const;
export type EstiloCena = (typeof ESTILOS_CENA)[number];

export const TIPOS_CENA = ['caixa', 'losango', 'estado', 'estado-final', 'nota', 'texto', 'formula', 'destaque'] as const;
export type TipoCena = (typeof TIPOS_CENA)[number];

/** O papel decide a cor: a pessoa aprende a "ler" o quadro pela cor. */
export const PAPEIS_CENA = ['conceito', 'exemplo', 'erro', 'dica', 'resultado', 'passo', 'entrada', 'saida', 'neutro'] as const;
export type PapelCena = (typeof PAPEIS_CENA)[number];

export interface ElementoCena {
  id: string;
  tipo: TipoCena;
  texto: string;
  papel: PapelCena;
  linha?: number;
  coluna?: number;
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
    const texto = typeof e.texto === 'string' ? e.texto.trim().slice(0, MAX_TEXTO) : '';
    if (!texto) continue;
    let id = typeof e.id === 'string' && e.id.trim() ? e.id.trim() : `e${elementos.length}`;
    if (ids.has(id)) id = `${id}-${elementos.length}`;
    ids.add(id);
    elementos.push({ id, tipo: noArray(TIPOS_CENA, e.tipo, 'caixa'), texto, papel: noArray(PAPEIS_CENA, e.papel, 'neutro'), linha: nat(e.linha), coluna: nat(e.coluna) });
  }
  if (elementos.length < 2) return null;
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
