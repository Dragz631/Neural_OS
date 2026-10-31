import { ehEscuro, misturar, rgbDe, type TemaValores } from '../../domain/tema';
import { useTema } from '../../store/tema';

// As cores do desenho (Excalidraw) seguindo o tema do app.
// O Excalidraw em modo escuro desenha com um filtro (invert + hue-rotate) em cima
// das cores guardadas, e isso não deixa chegar em cores muito vivas (o limão sairia
// oliva). Então, pra cada cor do tema, procuramos a cor GUARDADA cujo resultado
// depois do filtro fica mais perto da cor que o tema quer. No modo claro a cor é direta.

export type ModoQuadro = 'dark' | 'light';

export const modoQuadro = (v: TemaValores = useTema.getState().valores): ModoQuadro => (ehEscuro(v) ? 'dark' : 'light');

/** A matriz do hue-rotate(180deg), como o navegador usa. */
const M = [
  [-0.574, 1.43, 0.144],
  [0.426, 0.43, 0.144],
  [0.426, 1.43, -0.856],
];

/** Cor que aparece na tela, dada a cor guardada, no modo escuro: invert(93%) e depois hue-rotate(180deg). */
function aposFiltro(s: [number, number, number]): [number, number, number] {
  const inv = s.map((c) => 237.15 - 0.86 * c);
  return M.map((l) => Math.max(0, Math.min(255, l[0] * inv[0] + l[1] * inv[1] + l[2] * inv[2]))) as [number, number, number];
}

const hex = (c: [number, number, number]) => `#${c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;

const cache = new Map<string, string>();

/** A cor a guardar no desenho pra ela APARECER como `desejada` no modo dado. */
export function paraQuadro(desejada: string, modo: ModoQuadro): string {
  if (modo === 'light') return desejada;
  const chave = desejada.toLowerCase();
  const pronta = cache.get(chave);
  if (pronta) return pronta;
  const alvo = rgbDe(desejada);
  let melhor: [number, number, number] = [0, 0, 0];
  let menor = Infinity;
  for (let r = 0; r <= 255; r += 15)
    for (let g = 0; g <= 255; g += 15)
      for (let b = 0; b <= 255; b += 15) {
        const v = aposFiltro([r, g, b]);
        const e = (v[0] - alvo[0]) ** 2 + (v[1] - alvo[1]) ** 2 + (v[2] - alvo[2]) ** 2;
        if (e < menor) {
          menor = e;
          melhor = [r, g, b];
        }
      }
  const out = hex(melhor);
  cache.set(chave, out);
  return out;
}

export interface PaletaQuadro {
  modo: ModoQuadro;
  texto: string;
  mutado: string;
  destaque: string;
  aviso: string;
  perigo: string;
  info: string;
  fundoDestaque: string;
  fundoForte: string;
  fundoInfo: string;
  fundoAviso: string;
  fundoPerigo: string;
  /** fontFamily do Excalidraw: 3 = monoespaçada (Cascadia), 6 = Nunito. */
  fonte: number;
  arredondado: boolean;
  fundo: string;
}

/** A paleta do desenho a partir do tema atual (ou de um tema dado). */
export function paletaQuadro(v: TemaValores = useTema.getState().valores): PaletaQuadro {
  const modo = modoQuadro(v);
  const c = v.cores;
  const tom = (cor: string, k: number) => hex(misturar(c.bg, cor, k));
  const q = (cor: string) => paraQuadro(cor, modo);
  return {
    modo,
    texto: q(c.fg),
    mutado: q(c.muted),
    destaque: q(c.accent),
    aviso: q(c.warn),
    perigo: q(c.danger),
    info: q(c.info),
    fundoDestaque: q(tom(c.accent, 0.14)),
    fundoForte: q(tom(c.accent, 0.3)),
    fundoInfo: q(tom(c.info, 0.12)),
    fundoAviso: q(tom(c.warn, 0.14)),
    fundoPerigo: q(tom(c.danger, 0.14)),
    fonte: v.corpo === 'jetbrains' ? 3 : 6,
    arredondado: v.raio > 0,
    fundo: c.bg,
  };
}
