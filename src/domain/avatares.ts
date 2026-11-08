// Fotos de perfil em ASCII animado: leves (só texto) e no visual do app.
// Os COMUNS vêm no repositório. Cada pessoa pode ter os SEUS num arquivo só dela,
// `avatares.local.txt` na pasta do app (fora do git), no mesmo formato abaixo.
// A IA que a pessoa usa sabe criar: o formato está no README.
//
// Formato (texto puro, sem aspas nem escapes):
//   @avatar <id>              começa um avatar (id: letras, números e hífen)
//   nome: Samurai             nome que aparece pra escolher
//   ms: 700                   tempo de cada quadro (padrão 700)
//   cor: \=warn /=warn O=accent    cada caractere ganha uma cor do tema
//                             (accent, warn, info, danger, muted, fg)
//   ---                       começa um quadro; cada "---" seguinte é o próximo quadro

export type CorAvatar = 'accent' | 'warn' | 'info' | 'danger' | 'muted' | 'fg';

export interface Avatar {
  id: string;
  nome: string;
  ms: number;
  cores: Record<string, CorAvatar>;
  /** Cada quadro já com todas as linhas do mesmo tamanho. */
  quadros: string[][];
  /** De onde veio: o repositório ou o arquivo pessoal. */
  origem: 'comum' | 'meu';
}

const CORES_OK: CorAvatar[] = ['accent', 'warn', 'info', 'danger', 'muted', 'fg'];

/** Lê o texto do formato acima. Linhas estranhas são ignoradas (nunca quebra o app). */
export function lerAvatares(texto: string, origem: Avatar['origem']): Avatar[] {
  const out: Avatar[] = [];
  let atual: { id: string; nome: string; ms: number; cores: Record<string, CorAvatar>; quadros: string[][] } | undefined;
  let quadro: string[] | undefined;

  const fechar = () => {
    if (!atual) return;
    if (quadro) atual.quadros.push(quadro);
    quadro = undefined;
    const quadros = atual.quadros.map(aparar).filter((q) => q.length > 0);
    if (quadros.length) out.push({ ...atual, quadros: igualar(quadros), origem });
    atual = undefined;
  };

  for (const linhaCrua of texto.replace(/\r/g, '').split('\n')) {
    const linha = linhaCrua.replace(/\t/g, '  ');
    const novo = /^@avatar\s+([A-Za-z0-9-]{1,40})\s*$/.exec(linha);
    if (novo) {
      fechar();
      atual = { id: novo[1], nome: novo[1], ms: 700, cores: {}, quadros: [] };
      continue;
    }
    if (!atual) continue;
    if (linha.trim() === '---') {
      if (quadro) atual.quadros.push(quadro);
      quadro = [];
      continue;
    }
    if (quadro) {
      if (quadro.length < 16) quadro.push(linha.slice(0, 28));
      continue;
    }
    const cab = /^(nome|ms|cor):\s*(.*)$/.exec(linha);
    if (!cab) continue;
    if (cab[1] === 'nome') atual.nome = cab[2].trim().slice(0, 30) || atual.id;
    if (cab[1] === 'ms') atual.ms = Math.min(5000, Math.max(120, Number(cab[2]) || 700));
    if (cab[1] === 'cor')
      for (const par of cab[2].trim().split(/\s+/)) {
        const m = /^(.)=(\w+)$/.exec(par);
        if (m && CORES_OK.includes(m[2] as CorAvatar)) atual.cores[m[1]] = m[2] as CorAvatar;
      }
  }
  fechar();
  return out;
}

/** Tira linhas vazias do começo e do fim do quadro. */
function aparar(q: string[]): string[] {
  let a = 0;
  let b = q.length;
  while (a < b && !q[a].trim()) a++;
  while (b > a && !q[b - 1].trim()) b--;
  return q.slice(a, b);
}

/** Todos os quadros com a mesma largura e altura (a animação não "pula"). */
function igualar(quadros: string[][]): string[][] {
  const alt = Math.max(...quadros.map((q) => q.length));
  const larg = Math.max(...quadros.flat().map((l) => l.trimEnd().length));
  return quadros.map((q) => Array.from({ length: alt }, (_, i) => (q[i] ?? '').trimEnd().padEnd(larg, ' ')));
}

/** Foto → ASCII (pra quem quiser a própria foto no estilo do app). Recebe tons de cinza 0..255. */
export function fotoParaAscii(cinza: number[][], escala = ' .:-=+*#%@'): string[] {
  return cinza.map((linha) => linha.map((v) => escala[Math.min(escala.length - 1, Math.floor(((255 - v) / 256) * escala.length))]).join('').trimEnd());
}

// ─── Comuns (vêm no repositório) ─────────────────────────────────────────────
// String.raw: barra invertida fica literal, do jeito que aparece no desenho.
export const AVATARES_COMUNS_TEXTO = String.raw`
@avatar coruja
nome: Coruja
ms: 1400
cor: O=accent v=warn ^=warn
---
  /\___/\
 ( O   O )
 (   v   )
  \_____/
  /|   |\
   ^^ ^^
---
  /\___/\
 ( -   - )
 (   v   )
  \_____/
  /|   |\
   ^^ ^^

@avatar gato
nome: Gato
ms: 900
cor: o=accent ~=warn
---
  /\_/\
 ( o.o )
  > ^ <
 /     \
(_)---(_)~
---
  /\_/\
 ( -.- )
  > ^ <
 /     \
(_)---(_)/
---
  /\_/\
 ( o.o )
  > ^ <
 /     \
(_)---(_)~

@avatar robo
nome: Robô
ms: 600
cor: *=warn o=accent ==info
---
   [|.|]
  _|___|_
 | [o o] |
 |  ___  |
 |_[===]_|
   |   |
---
   [|*|]
  _|___|_
 | [o o] |
 |  ___  |
 |_[===]_|
   |   |
---
   [|.|]
  _|___|_
 | [- -] |
 |  ___  |
 |_[===]_|
   |   |

@avatar foguete
nome: Foguete
ms: 220
cor: ^=warn v=danger (=info )=info
---
    /\
   /  \
  | () |
  |    |
 /|    |\
/_|____|_\
   ^^^^
---
    /\
   /  \
  | () |
  |    |
 /|    |\
/_|____|_\
   vvvv

@avatar broto
nome: Broto
ms: 1600
cor: (=accent )=accent \=accent /=accent ,=accent
---
    ,
   (\
    |
  __|__
  \___/
---
   \ /
  (\|/)
    |
  __|__
  \___/

@avatar fantasma
nome: Fantasma
ms: 500
cor: o=accent ~=info
---
   .--.
  / oo \
 |  ~~  |
 |      |
 '^^^^^^'
---
   .--.
  / o o\
 |  ~~  |
 |      |
 'vvvvvv'

@avatar cafe
nome: Café
ms: 800
cor: (=muted )=muted ]=warn
---
   ( (
    ) )
  ......
  |    |]
  \____/
---
    ) )
   ( (
  ......
  |    |]
  \____/

@avatar terminal
nome: Terminal
ms: 530
cor: >=accent _=accent
---
 ________
| >_     |
|        |
|________|
   _|_|_
---
 ________
| >      |
|        |
|________|
   _|_|_
`;

export const AVATARES_COMUNS: Avatar[] = lerAvatares(AVATARES_COMUNS_TEXTO, 'comum');
