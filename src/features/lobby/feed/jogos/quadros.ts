import { ALTURA, Grade, LARGURA } from './ascii';
import type { TemaJogo } from './tema';

// Os quadros dos minijogos. Cada função recebe o estado e devolve o texto da grade.
// `dt` = quadros desde a resposta (-1 = ainda não respondeu). Nada aqui guarda estado.

export interface Estado {
  t: number;
  dt: number;
  n: number;
  certa: number;
  escolha: number | null;
  tema: TemaJogo;
}

const letra = (i: number) => String.fromCharCode(65 + i);
const colunaDe = (i: number, n: number) => 2 + Math.round(((i + 0.5) * (LARGURA - 4)) / n) - 1;

/** Chuva (estilo TuxMath): as alternativas descem; você atira na certa. */
export function quadroChuva(e: Estado): string {
  const g = new Grade();
  const chao = ALTURA - 3;
  const tt = e.escolha === null ? e.t : e.t - Math.max(0, e.dt); // congela a queda quando responde
  const ys = Array.from({ length: e.n }, (_, i) => Math.min(Math.floor(tt * 0.3) - i * 2, chao - 1));
  g.texto(0, ALTURA - 2, '='.repeat(LARGURA));

  const canhaoX = e.escolha === null ? Math.floor(LARGURA / 2) - 1 : colunaDe(e.escolha, e.n) - 1;
  g.texto(canhaoX, ALTURA - 1, '/^\\');

  const FORMAS = [[' * ', '*+*', ' * '], ['\\|/', '-*-', '/|\\'], ['. .', ' * ', '. .'], ['   ', ' . ', '   ']];

  for (let i = 0; i < e.n; i++) {
    const y = ys[i];
    if (y < 0) continue;
    const x = colunaDe(i, e.n) - 1;
    if (e.escolha === i) {
      // O tiro sobe 2 linhas por quadro; ao chegar na alternativa, ela explode (certa) ou vira X (errada).
      const dtAcerto = Math.ceil((ALTURA - 3 - (y + 1)) / 2);
      if (e.dt < dtAcerto) {
        for (let yy = ALTURA - 3 - e.dt * 2; yy <= ALTURA - 3; yy++) g.texto(x + 1, yy, '|');
        g.texto(x, y, `[${letra(i)}]`);
      } else if (i === e.certa) {
        FORMAS[Math.min(3, Math.floor((e.dt - dtAcerto) / 2))].forEach((l, r) => g.texto(x, y - 1 + r, l));
      } else {
        g.texto(x, y, 'X X');
        g.texto(x, y + 1, ' X ');
      }
    } else if (e.escolha !== null && i === e.certa && e.dt > 6) {
      // Errou: a certa pisca pra você ver qual era.
      g.texto(x, y, e.t % 2 ? `<${letra(i)}>` : `[${letra(i)}]`);
    } else {
      g.texto(x, y, `[${letra(i)}]`);
    }
  }
  return g.toString();
}

/** Comilão (estilo Pac-Man): você é o C e come a alternativa certa. Os pontinhos são símbolos do assunto. */
export function quadroComilao(e: Estado & { pos: number }): string {
  const g = new Grade();
  const caminho = ALTURA - 3;
  // Trilha de "pontinhos" feita dos símbolos da matéria.
  let x = 1;
  let k = 0;
  while (x < LARGURA - 2) {
    const s = e.tema.simbolos[k % e.tema.simbolos.length];
    g.texto(x, caminho, s);
    x += s.length + 2;
    k++;
  }
  g.texto(0, caminho + 1, '#'.repeat(LARGURA));
  g.texto(0, 1, '#'.repeat(LARGURA));

  const itemY = 3;
  const cx = colunaDe(e.escolha ?? e.pos, e.n) - 1;
  const subida = e.escolha === null ? 0 : Math.min(e.dt, caminho - itemY - 1);
  const cy = caminho - subida;
  const comeu = e.escolha !== null && e.dt >= caminho - itemY - 1;

  for (let i = 0; i < e.n; i++) {
    const ix = colunaDe(i, e.n) - 1;
    if (comeu && i === e.escolha) {
      if (i === e.certa) g.texto(ix, itemY, e.dt % 2 ? ' * ' : '*+*');
      else g.texto(ix, itemY, e.dt % 2 ? 'M M' : 'W W');
    } else g.texto(ix, itemY, `[${letra(i)}]`);
  }

  const boca = e.escolha !== null && comeu ? (e.certa === e.escolha ? 'C' : 'x') : ['C', 'c', 'O', 'c'][e.t % 4];
  g.texto(cx + 1, cy, boca, true);
  if (e.escolha === null) g.texto(cx - 1, cy, '<');
  return g.toString();
}

/** Batalha (estilo Pokémon): cada alternativa é um ataque. Acertar derrota o chefe; errar, ele revida. */
export function quadroBatalha(e: Estado, voce = 'VOCÊ'): string {
  const g = new Grade();
  const respondeu = e.escolha !== null;
  const acertou = e.escolha === e.certa;
  const balanco = respondeu ? 0 : e.t % 4 < 2 ? 0 : 1;

  // Chefe (em cima, à direita).
  let ex = 27 + balanco;
  if (respondeu && !acertou) ex -= Math.min(e.dt, 3) * 3 - (e.dt > 4 ? Math.min(e.dt - 3, 3) * 3 : 0);
  const derrotado = respondeu && acertou && e.dt >= 7;
  const piscando = respondeu && acertou && e.dt >= 4 && e.dt < 7;
  if (derrotado) {
    g.texto(ex, 4, '  x_x  ');
    g.texto(ex, 5, ' _/|\\_ ');
  } else if (piscando) {
    for (let r = 0; r < e.tema.sprite.length; r++) g.texto(ex, 1 + r, e.t % 2 ? e.tema.sprite[r].replace(/\S/g, '*') : e.tema.sprite[r]);
  } else {
    g.sprite(ex, 1, e.tema.sprite);
  }
  const hpChefe = derrotado ? 0 : respondeu && acertou && e.dt >= 4 ? 3 : 10;
  g.texto(0, 1, e.tema.chefe.slice(0, 18).toUpperCase());
  g.texto(0, 2, `HP [${'#'.repeat(hpChefe)}${'-'.repeat(10 - hpChefe)}]`);

  // Jogador (embaixo, à esquerda).
  let px = 4;
  if (respondeu && acertou) px += Math.min(e.dt, 3) * 5 - (e.dt > 4 ? Math.min(e.dt - 3, 3) * 5 : 0);
  const apanhou = respondeu && !acertou && e.dt >= 4;
  const flash = respondeu && !acertou && e.dt >= 4 && e.dt < 7 && e.t % 2 === 0;
  g.texto(px, 7, flash ? ' * ' : ' o ');
  g.texto(px, 8, flash ? '*|*' : '/|\\');
  g.texto(px, 9, flash ? '* *' : '/ \\');
  g.texto(22, 9, voce.toUpperCase().slice(0, 12));
  const hpVoce = apanhou && e.dt >= 7 ? 5 : 10;
  g.texto(22, 10, `HP [${'#'.repeat(hpVoce)}${'-'.repeat(10 - hpVoce)}]`);

  // Menu de ataques: as letras são as mesmas da legenda embaixo.
  if (!respondeu) g.texto(0, ALTURA - 2, `ATAQUES ${Array.from({ length: e.n }, (_, i) => `[${letra(i)}]`).join(' ')}`);

  // Fala.
  const msg = !respondeu ? `Um ${e.tema.chefe} apareceu! Qual ataque?` : acertou ? (e.dt >= 7 ? 'ACERTOU! Chefe derrotado!' : 'Golpe certeiro...') : e.dt >= 4 ? `Errou! ${e.tema.golpe}.` : 'O chefe revida...';
  g.texto(0, ALTURA - 1, msg.slice(0, LARGURA));
  return g.toString();
}
