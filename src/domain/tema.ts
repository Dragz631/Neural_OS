// Tema do Neural-OS: só APARÊNCIA (cores, fontes, forma, efeitos, movimento).
// Nunca muda o que o app faz e nunca troca sozinho: quem escolhe é a pessoa.
// Tudo vira variável CSS (ver store/tema.ts), então qualquer tela acompanha.

export interface CoresTema {
  bg: string;
  panel: string;
  panel2: string;
  line: string;
  fg: string;
  muted: string;
  accent: string;
  warn: string;
  danger: string;
  info: string;
  /** Cor do texto sobre o destaque. Ausente = escolhe preto ou claro sozinho. */
  onAccent?: string;
}

export type FonteCorpo = 'jetbrains' | 'sistema';
export type FonteTitulos = 'silkscreen' | 'michroma' | 'corpo';
export type Moldura = 'simples' | 'colchetes';
export type Movimento = 'passos' | 'suave' | 'nenhum';

export interface TemaValores {
  cores: CoresTema;
  corpo: FonteCorpo;
  titulos: FonteTitulos;
  /** Arredondamento dos cantos, em px (0 = reto). */
  raio: number;
  moldura: Moldura;
  /** Brilho (glow) em volta dos destaques. */
  brilho: boolean;
  /** Grade fina e vinheta no fundo. */
  grade: boolean;
  scanline: boolean;
  /** Título do app em degradê cromado. */
  cromo: boolean;
  movimento: Movimento;
  /** Mostra a orbe do professor. */
  orbe: boolean;
}

export interface PresetTema {
  id: string;
  nome: string;
  descricao: string;
  valores: TemaValores;
}

/** Brazuka: Y2K chrome + ASCII + dither. Limão, cromo e âmbar. Nunca vermelho. */
const BRAZUKA: TemaValores = {
  cores: { bg: '#0b0c0d', panel: '#101214', panel2: '#15181b', line: '#2a2e32', fg: '#e8ebee', muted: '#8a9198', accent: '#c8f03a', onAccent: '#000000', warn: '#ffb000', danger: '#ff9a1f', info: '#bfe3ff' },
  corpo: 'jetbrains',
  titulos: 'silkscreen',
  raio: 2,
  moldura: 'colchetes',
  brilho: true,
  grade: true,
  scanline: true,
  cromo: true,
  movimento: 'passos',
  orbe: true,
};

/** O visual verde de hacker que o Neural-OS tinha antes. */
const NEURAL: TemaValores = {
  cores: { bg: '#0a0f0d', panel: '#0d1411', panel2: '#111b16', line: '#1f3a2c', fg: '#b9d4b3', muted: '#6f8f69', accent: '#00ff66', onAccent: '#000000', warn: '#ffb347', danger: '#ffb347', info: '#7cf0ff' },
  corpo: 'jetbrains',
  titulos: 'corpo',
  raio: 4,
  moldura: 'simples',
  brilho: true,
  grade: false,
  scanline: false,
  cromo: false,
  movimento: 'suave',
  orbe: true,
};

/** Dragz Design v21, versão escura: verdes e creme, sombra seca, sem brilho. */
const DRAGZ_ESCURO: TemaValores = {
  cores: { bg: '#141b10', panel: '#1f2a18', panel2: '#2a3822', line: '#3a4726', fg: '#efe9cc', muted: '#b8c2a0', accent: '#e8d78e', onAccent: '#141b10', warn: '#e8d78e', danger: '#e8b04a', info: '#9dc69c' },
  corpo: 'jetbrains',
  titulos: 'silkscreen',
  raio: 0,
  moldura: 'simples',
  brilho: false,
  grade: false,
  scanline: false,
  cromo: false,
  movimento: 'passos',
  orbe: false,
};

/** Dragz Design v21, versão clara. */
const DRAGZ_CLARO: TemaValores = {
  cores: { bg: '#f4f1df', panel: '#e1ebd2', panel2: '#d2e0c0', line: '#c5d3ae', fg: '#1a2415', muted: '#46513f', accent: '#34502f', onAccent: '#f4f1df', warn: '#6b5b08', danger: '#8a5a00', info: '#587350' },
  corpo: 'jetbrains',
  titulos: 'silkscreen',
  raio: 0,
  moldura: 'simples',
  brilho: false,
  grade: false,
  scanline: false,
  cromo: false,
  movimento: 'passos',
  orbe: false,
};

export const PRESETS: PresetTema[] = [
  { id: 'brazuka', nome: 'Brazuka', descricao: 'Y2K cromado, ASCII e dither. Limão, cromo e âmbar. O seu tema.', valores: BRAZUKA },
  { id: 'neural', nome: 'Neural clássico', descricao: 'O verde de terminal que o app tinha antes.', valores: NEURAL },
  { id: 'dragz-escuro', nome: 'Dragz v21 escuro', descricao: 'Verdes e creme, cantos retos, sem brilho.', valores: DRAGZ_ESCURO },
  { id: 'dragz-claro', nome: 'Dragz v21 claro', descricao: 'A versão clara do Dragz Design: papel creme e verde.', valores: DRAGZ_CLARO },
];

export const TEMA_PADRAO = 'brazuka';

export const presetPorId = (id: string): PresetTema => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

export const copiarValores = (v: TemaValores): TemaValores => ({ ...v, cores: { ...v.cores } });

// ─── Cor ────────────────────────────────────────────────────────────────────

export const ehHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** Luminância relativa (0 = preto, 1 = branco), a mesma conta do WCAG. */
export function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Texto legível sobre a cor de destaque (preto ou claro, o que contrastar mais). */
export function corSobre(fundo: string): string {
  return contraste(fundo, '#000000') >= contraste(fundo, '#f5f5ee') ? '#000000' : '#f5f5ee';
}

export const ehEscuro = (v: TemaValores) => luminancia(v.cores.bg) < 0.4;

/** Mistura a com b (k = 0 fica em a, k = 1 vira b). */
export function misturar(a: string, b: string, k: number): [number, number, number] {
  const [x, y] = [rgb(a), rgb(b)];
  return [0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * k)) as [number, number, number];
}

export const rgbDe = rgb;

// ─── Fontes ─────────────────────────────────────────────────────────────────

export const FONTE_CORPO: Record<FonteCorpo, string> = {
  jetbrains: '"JetBrains Mono", "Cascadia Code", Consolas, ui-monospace, monospace',
  sistema: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};
export const FONTE_TITULOS: Record<FonteTitulos, string> = {
  silkscreen: '"Silkscreen", "JetBrains Mono", ui-monospace, monospace',
  michroma: '"Michroma", "JetBrains Mono", sans-serif',
  corpo: 'inherit',
};

// ─── Importar/exportar (pra mandar o tema pra um amigo) ─────────────────────

/** Aceita um JSON de tema e devolve só o que é válido (o resto cai no preset base). */
export function lerTema(bruto: unknown, base: TemaValores): TemaValores | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const o = bruto as Record<string, unknown>;
  const out = copiarValores(base);
  const cores = (o.cores ?? {}) as Record<string, unknown>;
  for (const k of ['bg', 'panel', 'panel2', 'line', 'fg', 'muted', 'accent', 'warn', 'danger', 'info', 'onAccent'] as const) {
    if (ehHex(cores[k])) out.cores[k] = cores[k] as string;
  }
  if (o.corpo === 'jetbrains' || o.corpo === 'sistema') out.corpo = o.corpo;
  if (o.titulos === 'silkscreen' || o.titulos === 'michroma' || o.titulos === 'corpo') out.titulos = o.titulos;
  if (typeof o.raio === 'number' && o.raio >= 0 && o.raio <= 24) out.raio = Math.round(o.raio);
  if (o.moldura === 'simples' || o.moldura === 'colchetes') out.moldura = o.moldura;
  if (o.movimento === 'passos' || o.movimento === 'suave' || o.movimento === 'nenhum') out.movimento = o.movimento;
  for (const k of ['brilho', 'grade', 'scanline', 'cromo', 'orbe'] as const) {
    if (typeof o[k] === 'boolean') out[k] = o[k] as boolean;
  }
  return out;
}
