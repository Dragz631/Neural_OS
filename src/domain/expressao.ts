// Calculadora de funções, estilo Desmos, sem eval: lê "y = x^2 - 3x + 2", "sin(x)/x",
// "2x+1", "sqrt(x)", "x = 3" (reta vertical)... e devolve uma função de x.
// O professor escreve a expressão; aqui só se calcula. Nunca executa código.

export type Funcao = (x: number) => number;
export type Compilada = { tipo: 'funcao'; f: Funcao } | { tipo: 'vertical'; x: number };

const FUNCOES: Record<string, Funcao> = {
  sin: Math.sin,
  sen: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  raiz: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};
const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E };
// Os nomes mais longos primeiro: "sen" não pode virar "s", "e", "n".
const NOMES = [...Object.keys(FUNCOES), ...Object.keys(CONSTANTES), 'x'].sort((a, b) => b.length - a.length);

type Token = { t: 'num'; v: number } | { t: 'x' } | { t: 'const'; v: number } | { t: 'fn'; f: Funcao } | { t: 'op'; v: string };

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/×|·/g, '*')
    .replace(/÷/g, '/')
    .replace(/−|–/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/\*\*/g, '^')
    .replace(/,/g, '.')
    .replace(/\s+/g, '');
}

function tokenizar(s: string): Token[] | null {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      const bruto = /^\d*\.?\d*/.exec(s.slice(i))?.[0] ?? '';
      const v = Number(bruto);
      if (!bruto || bruto === '.' || !Number.isFinite(v)) return null;
      out.push({ t: 'num', v });
      i += bruto.length;
    } else if (/[a-z]/.test(c)) {
      const nome = NOMES.find((n) => s.startsWith(n, i));
      if (!nome) return null; // letra desconhecida (y, a, b...): não há parâmetros livres
      if (nome === 'x') out.push({ t: 'x' });
      else if (nome in CONSTANTES) out.push({ t: 'const', v: CONSTANTES[nome] });
      else out.push({ t: 'fn', f: FUNCOES[nome] });
      i += nome.length;
    } else if ('+-*/^()'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else return null;
  }
  return out;
}

type No = (x: number) => number;

function montar(tokens: Token[]): No | null {
  let p = 0;
  let profundidade = 0;
  const olha = () => tokens[p];
  const ehOp = (t: Token | undefined, v: string) => !!t && t.t === 'op' && t.v === v;

  const expr = (): No | null => {
    let esq = termo();
    while (esq && (ehOp(olha(), '+') || ehOp(olha(), '-'))) {
      const op = (tokens[p++] as { v: string }).v;
      const dir = termo();
      if (!dir) return null;
      const a = esq;
      esq = op === '+' ? (x) => a(x) + dir(x) : (x) => a(x) - dir(x);
    }
    return esq;
  };

  const termo = (): No | null => {
    let esq = unario();
    for (;;) {
      const t = olha();
      if (!esq || !t) break;
      let op: string | null = null;
      if (ehOp(t, '*') || ehOp(t, '/')) {
        op = (tokens[p++] as { v: string }).v;
      } else if (t.t === 'num' || t.t === 'x' || t.t === 'const' || t.t === 'fn' || ehOp(t, '(')) {
        op = '*'; // multiplicação implícita: 2x, 3(x+1), x sin(x)
      } else break;
      const dir = unario();
      if (!dir) return null;
      const a = esq;
      esq = op === '*' ? (x) => a(x) * dir(x) : (x) => a(x) / dir(x);
    }
    return esq;
  };

  const unario = (): No | null => {
    if (ehOp(olha(), '-')) {
      p++;
      const v = unario();
      return v ? (x) => -v(x) : null;
    }
    if (ehOp(olha(), '+')) {
      p++;
      return unario();
    }
    return potencia();
  };

  const potencia = (): No | null => {
    const base = atomo();
    if (base && ehOp(olha(), '^')) {
      p++;
      const exp = unario(); // associa à direita: 2^3^2 = 2^(3^2)
      return exp ? (x) => Math.pow(base(x), exp(x)) : null;
    }
    return base;
  };

  const atomo = (): No | null => {
    const t = tokens[p++];
    if (!t) return null;
    if (t.t === 'num') return () => t.v;
    if (t.t === 'const') return () => t.v;
    if (t.t === 'x') return (x) => x;
    if (t.t === 'fn') {
      // sin(x), sin x, sin 2x (o argumento é a potência seguinte)
      const arg = ehOp(olha(), '(') ? atomo() : potencia();
      return arg ? (x) => t.f(arg(x)) : null;
    }
    if (ehOp(t, '(')) {
      if (++profundidade > 40) return null;
      const dentro = expr();
      profundidade--;
      if (!dentro || !ehOp(tokens[p++], ')')) return null;
      return dentro;
    }
    return null;
  };

  const raiz = expr();
  return raiz && p === tokens.length ? raiz : null;
}

/** Lê uma expressão. null = não entendi (o gráfico ignora essa função em vez de errar). */
export function compilarExpressao(fonte: string): Compilada | null {
  if (typeof fonte !== 'string' || fonte.length > 120) return null;
  let s = normalizar(fonte);
  const vertical = /^x=(.+)$/.exec(s);
  if (vertical) {
    const t = tokenizar(vertical[1]);
    const no = t && !t.some((k) => k.t === 'x') ? montar(t) : null;
    const v = no ? no(0) : NaN;
    return Number.isFinite(v) ? { tipo: 'vertical', x: v } : null;
  }
  s = s.replace(/^(?:y|f\(x\))=/, '');
  const tokens = tokenizar(s);
  if (!tokens || tokens.length === 0) return null;
  const f = montar(tokens);
  return f ? { tipo: 'funcao', f } : null;
}
