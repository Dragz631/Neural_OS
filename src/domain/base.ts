// "Travei numa base" (Hugo, 08/11/2026): o aluno não sabe uma conta que a aula supõe
// (dividir, fração, regra de três...). O professor abre um parêntese DESENHADO, sem
// parar a aula: de 3 a 6 quadros, cada um com no máximo 8 palavras, e o desenho faz
// o resto (12 bolinhas em 3 grupos, pizza repartida, tabela com a seta cruzada).
// No fim, 1 pergunta pra conferir. O professor só dá o tipo de desenho e os números;
// o app desenha (nada de coordenada, nada de parágrafo).

export type DesenhoBase =
  /** Repartir: `total` bolinhas em `grupos` grupos iguais (a sobra aparece separada). */
  | { tipo: 'grupos'; total: number; grupos: number }
  /** Vezes: `linhas` fileiras de `colunas` bolinhas; as `destaque` primeiras pintadas. */
  | { tipo: 'fileiras'; linhas: number; colunas: number; destaque?: number }
  /** Fração: `pintadas` de `partes` (barra ou pizza). */
  | { tipo: 'fracao'; partes: number; pintadas: number; forma: 'barra' | 'pizza' }
  /** A conta escrita grande, uma linha por passo ("12 ÷ 3 = 4"). */
  | { tipo: 'conta'; linhas: string[] }
  /** Regra de três: a está pra b assim como c está pra x (x é o que se quer). */
  | { tipo: 'regra3'; a: string; b: string; c: string; x: string; rotulos?: [string, string] }
  /** Reta numérica: de `de` até `ate`, com pontos marcados e um salto opcional. */
  | { tipo: 'reta'; de: number; ate: number; marcas: number[]; salto?: { de: number; para: number; rotulo?: string } };

export interface QuadroBase {
  /** Até 8 palavras: o desenho explica, o texto só nomeia. */
  texto: string;
  desenho?: DesenhoBase;
}

export interface PerguntaBase {
  texto: string;
  resposta: string;
}

export interface ExplicacaoBase {
  /** O nome da base, curto: "Divisão", "Fração", "Regra de três". */
  titulo: string;
  quadros: QuadroBase[];
  pergunta: PerguntaBase;
}

/** As bases mais comuns, prontas pra um toque. */
export const ATALHOS_BASE: { rotulo: string; duvida: string }[] = [
  { rotulo: 'Dividir', duvida: 'não sei dividir' },
  { rotulo: 'Multiplicar', duvida: 'não sei multiplicar direito' },
  { rotulo: 'Fração', duvida: 'não entendo fração' },
  { rotulo: 'Porcentagem', duvida: 'não sei calcular porcentagem' },
  { rotulo: 'Regra de três', duvida: 'não sei fazer regra de três' },
  { rotulo: 'Potência e raiz', duvida: 'não entendo potência e raiz quadrada' },
  { rotulo: 'Equação simples', duvida: 'não sei resolver equação simples (achar o x)' },
  { rotulo: 'Número negativo', duvida: 'me perco com número negativo' },
];

const MAX_PALAVRAS = 10; // o prompt pede 8; uma folguinha antes de cortar
const inteiro = (v: unknown, min: number, max: number): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : undefined);
const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1000 ? v : undefined);
const curto = (v: unknown, max: number): string => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '');

/** Corta o texto do quadro em `MAX_PALAVRAS`: base é desenho, não leitura. */
export function encurtar(texto: string): string {
  const p = texto.split(/\s+/).filter(Boolean);
  return p.length <= MAX_PALAVRAS ? p.join(' ') : `${p.slice(0, 8).join(' ')}…`;
}

function lerDesenho(bruto: unknown): DesenhoBase | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined;
  const d = bruto as Record<string, unknown>;
  switch (d.tipo) {
    case 'grupos': {
      const total = inteiro(d.total, 1, 60);
      const grupos = inteiro(d.grupos, 1, 12);
      return total && grupos ? { tipo: 'grupos', total, grupos } : undefined;
    }
    case 'fileiras': {
      const linhas = inteiro(d.linhas, 1, 12);
      const colunas = inteiro(d.colunas, 1, 12);
      if (!linhas || !colunas) return undefined;
      const destaque = inteiro(d.destaque, 0, linhas * colunas);
      return { tipo: 'fileiras', linhas, colunas, ...(destaque ? { destaque } : {}) };
    }
    case 'fracao': {
      const partes = inteiro(d.partes, 1, 24);
      if (!partes) return undefined;
      const pintadas = inteiro(d.pintadas, 0, partes) ?? 0;
      return { tipo: 'fracao', partes, pintadas, forma: d.forma === 'pizza' ? 'pizza' : 'barra' };
    }
    case 'conta': {
      const linhas = (Array.isArray(d.linhas) ? d.linhas : [d.linhas]).map((l) => curto(l, 40)).filter(Boolean).slice(0, 4);
      return linhas.length ? { tipo: 'conta', linhas } : undefined;
    }
    case 'regra3': {
      const [a, b, c] = [curto(d.a, 14), curto(d.b, 14), curto(d.c, 14)];
      const x = curto(d.x, 14) || 'x';
      if (!a || !b || !c) return undefined;
      const r = Array.isArray(d.rotulos) ? d.rotulos.map((s) => curto(s, 16)) : [];
      return { tipo: 'regra3', a, b, c, x, ...(r[0] && r[1] ? { rotulos: [r[0], r[1]] as [string, string] } : {}) };
    }
    case 'reta': {
      let de = numero(d.de);
      let ate = numero(d.ate);
      if (de === undefined || ate === undefined) return undefined;
      if (de > ate) [de, ate] = [ate, de];
      if (ate - de < 1 || ate - de > 40) return undefined;
      const marcas = (Array.isArray(d.marcas) ? d.marcas : []).map(numero).filter((n): n is number => n !== undefined && n >= de! && n <= ate!).slice(0, 6);
      const s = (d.salto ?? null) as Record<string, unknown> | null;
      const sd = numero(s?.de);
      const sp = numero(s?.para);
      const salto = sd !== undefined && sp !== undefined && sd >= de && sd <= ate && sp >= de && sp <= ate && sd !== sp ? { de: sd, para: sp, ...(curto(s?.rotulo, 16) ? { rotulo: curto(s?.rotulo, 16) } : {}) } : undefined;
      return { tipo: 'reta', de, ate, marcas, ...(salto ? { salto } : {}) };
    }
    default:
      return undefined;
  }
}

/** Aceita o JSON do professor; null se não deu pelo menos 2 quadros e uma pergunta. */
export function lerBase(bruto: unknown): ExplicacaoBase | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const o = bruto as Record<string, unknown>;
  const quadros: QuadroBase[] = [];
  for (const q of (Array.isArray(o.quadros) ? o.quadros : []).slice(0, 6)) {
    if (!q || typeof q !== 'object') continue;
    const r = q as Record<string, unknown>;
    const texto = encurtar(curto(r.texto, 120));
    const desenho = lerDesenho(r.desenho);
    if (!texto && !desenho) continue;
    quadros.push({ texto, ...(desenho ? { desenho } : {}) });
  }
  const p = (o.pergunta ?? {}) as Record<string, unknown>;
  const pergunta = { texto: curto(p.texto, 140), resposta: curto(p.resposta, 30) };
  if (quadros.length < 2 || !pergunta.texto || !pergunta.resposta) return null;
  return { titulo: curto(o.titulo, 40) || 'Base', quadros, pergunta };
}

const semAcento = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

/** "1/2", "0,5", "50%", "-3", "x = 4" → número; null se não for número. */
export function valorDe(texto: string): number | null {
  const t = semAcento(texto)
    .replace(/^[a-z]\s*=\s*/, '') // "x = 4"
    .replace(/\s/g, '')
    .replace(',', '.');
  let m = /^(-?\d+(?:\.\d+)?)%$/.exec(t);
  if (m) return Number(m[1]) / 100;
  m = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(t);
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2]);
  return /^-?\d+(?:\.\d+)?$/.test(t) ? Number(t) : null;
}

/**
 * Confere a resposta do aluno com a certa. Número vale em qualquer jeito de escrever
 * ("1/2" = "0,5" = "50%"); texto, sem acento e sem maiúscula.
 */
export function respostaCerta(dada: string, certa: string): boolean {
  if (!dada.trim()) return false;
  const a = valorDe(dada);
  const b = valorDe(certa);
  const perto = (x: number, y: number) => Math.abs(x - y) <= Math.max(1e-6, Math.abs(y) * 1e-3);
  if (a !== null && b !== null) {
    if (perto(a, b)) return true;
    // "50%" pedido e o aluno escreveu "50" (sem o %), ou o contrário: aceita.
    const pctCerta = /%$/.test(certa.trim());
    const pctDada = /%$/.test(dada.trim());
    if (pctCerta && !pctDada) return perto(a / 100, b);
    if (pctDada && !pctCerta) return perto(a * 100, b);
    return false;
  }
  return semAcento(dada) === semAcento(certa);
}

/** A base "sai da lista de fracas" quando ele acertou a pergunta de conferir várias vezes. */
export const ACERTOS_PRA_FIRMAR = 3;
