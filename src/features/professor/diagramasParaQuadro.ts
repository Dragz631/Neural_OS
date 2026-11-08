import { ARVORE, GRADE_CEL, folhas, larguraColunaTabela, type Arvore, type Conjuntos, type Diagrama, type GradeDiagrama, type NoArvore, type Tabela } from '../../domain/diagramas';
import type { PaletaQuadro } from '../lousa/temaQuadro';
import { quebrar, type Esqueleto } from './aulaParaQuadro';

// Desenha os diagramas do professor (árvore, conjuntos, grade, tabela) como elementos
// do Excalidraw: tudo vetorial e editável, nas cores do tema. A moldura leva o `id`
// do elemento, pra as setas da cena poderem se prender no diagrama inteiro.

const TOPO = 26; // espaço do título

type Ctx = { out: Esqueleto[]; p: PaletaQuadro };

const texto = (c: Ctx, x: number, y: number, t: string, tamanho: number, cor: string) => c.out.push({ type: 'text', x, y, text: t, fontSize: tamanho, strokeColor: cor, fontFamily: c.p.fonte });
const linha = (c: Ctx, x0: number, y0: number, x1: number, y1: number, cor: string, largura = 2) =>
  c.out.push({ type: 'line', x: x0, y: y0, points: [[0, 0], [x1 - x0, y1 - y0]] as never, strokeColor: cor, strokeWidth: largura, roughness: 0, roundness: null } as Esqueleto);
const corta = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

// ── Árvore (de lado, como a de probabilidade: raiz à esquerda, galhos pra direita) ──

function arvore(c: Ctx, a: Arvore, x: number, y: number) {
  const { colW, noW, noH, folhaH } = ARVORE;
  const rodar = c.p.arredondado ? ({ type: 3 } as const) : null;
  let folha = 0;
  const desenhar = (no: NoArvore, nivel: number): number => {
    // Posição vertical: folha = próxima vaga; pai = meio dos filhos.
    const ys = no.filhos.map((f) => desenhar(f, nivel + 1));
    const cy = ys.length ? (ys[0] + ys[ys.length - 1]) / 2 : y + folha++ * folhaH + noH / 2;
    const nx = x + nivel * colW;
    const raiz = nivel === 0;
    const ehFolha = no.filhos.length === 0;
    c.out.push({
      type: 'rectangle',
      x: nx,
      y: cy - noH / 2,
      width: noW,
      height: noH,
      strokeColor: raiz || ehFolha ? c.p.destaque : c.p.texto,
      backgroundColor: raiz ? c.p.fundoForte : ehFolha ? c.p.fundoDestaque : 'transparent',
      fillStyle: 'solid',
      strokeWidth: raiz ? 3 : 2,
      roughness: 0,
      roundness: rodar,
      label: { text: quebrar(no.texto, 18), fontSize: 14, strokeColor: c.p.texto, fontFamily: c.p.fonte },
    });
    // Galhos: do lado direito do pai até o lado esquerdo de cada filho, com a chance no meio.
    no.filhos.forEach((f, i) => {
      const x0 = nx + noW;
      const x1 = nx + colW;
      linha(c, x0, cy, x1, ys[i], c.p.destaque);
      if (f.chance) texto(c, (x0 + x1) / 2 - f.chance.length * 4, (cy + ys[i]) / 2 - 20, f.chance, 15, c.p.aviso);
    });
    return cy;
  };
  desenhar(a.raiz, 0);
}

// ── Conjuntos (Venn de 2 ou 3) ──────────────────────────────────────────────

/** Centro de cada região (relativo ao universo), pela "máscara" de quem contém o item. */
const REGIOES_2: Record<number, [number, number]> = { 1: [120, 150], 2: [380, 150], 3: [250, 150] };
const REGIOES_3: Record<number, [number, number]> = { 1: [125, 140], 2: [395, 140], 4: [260, 365], 3: [260, 110], 5: [185, 265], 6: [335, 265], 7: [260, 215] };

function conjuntos(c: Ctx, d: Conjuntos, x: number, y: number, w: number, h: number) {
  const tres = d.conjuntos.length === 3;
  const cores = [c.p.destaque, c.p.info, c.p.aviso];
  // Universo.
  c.out.push({ type: 'rectangle', x, y, width: w, height: h, strokeColor: c.p.mutado, backgroundColor: 'transparent', strokeWidth: 1, roughness: 0, roundness: null });
  if (d.universo) texto(c, x + 8, y + h - 22, d.universo, 14, c.p.mutado);
  const circulos: [number, number, number, number][] = tres
    ? [
        [60, 40, 260, 260],
        [200, 40, 260, 260],
        [130, 160, 260, 260],
      ]
    : [
        [40, 40, 260, 220],
        [200, 40, 260, 220],
      ];
  circulos.forEach(([cx, cy, cw, ch], i) => {
    c.out.push({ type: 'ellipse', x: x + cx, y: y + cy, width: cw, height: ch, strokeColor: cores[i], backgroundColor: 'transparent', strokeWidth: 3, roughness: 0 });
  });
  // Nomes perto de cada círculo.
  const nomes: [number, number][] = tres ? [[40, 10], [300, 10], [395, 380]] : [[50, 12], [300, 12]];
  d.conjuntos.forEach((cj, i) => texto(c, x + nomes[i][0], y + nomes[i][1], corta(cj.nome, 24), 16, cores[i]));

  // Cada item vai pra região de quem o contém (o código calcula a interseção).
  const porRegiao = new Map<number, string[]>();
  const todos = [...new Set(d.conjuntos.flatMap((cj) => cj.itens))];
  for (const item of todos) {
    const mascara = d.conjuntos.reduce((m, cj, i) => (cj.itens.includes(item) ? m | (1 << i) : m), 0);
    porRegiao.set(mascara, [...(porRegiao.get(mascara) ?? []), item]);
  }
  const centros = tres ? REGIOES_3 : REGIOES_2;
  porRegiao.forEach((itens, mascara) => {
    const centro = centros[mascara];
    if (!centro) return;
    const mostrar = itens.length > 5 ? [...itens.slice(0, 4), '…'] : itens;
    mostrar.forEach((it, k) => texto(c, x + centro[0] - it.length * 4.5, y + centro[1] - (mostrar.length * 18) / 2 + k * 18, it, 15, c.p.texto));
  });
  if (d.fora.length) texto(c, x + w - 12 - d.fora.join('  ').length * 8, y + h - 22, d.fora.join('  '), 14, c.p.texto);
}

// ── Grade (espaço amostral, matriz, tabuleiro) ──────────────────────────────

function grade(c: Ctx, g: GradeDiagrama, x: number, y: number) {
  const L = GRADE_CEL;
  const ox = x + (g.rotulosLinhas ? L : 0);
  const oy = y + (g.rotulosColunas ? L : 0);
  const marcada = new Set(g.destaque.map(([l, col]) => `${l}:${col}`));
  g.rotulosColunas?.forEach((r, col) => texto(c, ox + col * L + L / 2 - r.length * 4, y + L / 2 - 9, r, 14, c.p.mutado));
  g.rotulosLinhas?.forEach((r, l) => texto(c, x + L / 2 - r.length * 4, oy + l * L + L / 2 - 9, r, 14, c.p.mutado));
  for (let l = 0; l < g.linhas; l++) {
    for (let col = 0; col < g.colunas; col++) {
      const m = marcada.has(`${l}:${col}`);
      const t = g.celulas?.[l]?.[col] ?? '';
      c.out.push({
        type: 'rectangle',
        x: ox + col * L,
        y: oy + l * L,
        width: L,
        height: L,
        strokeColor: m ? c.p.destaque : c.p.mutado,
        backgroundColor: m ? c.p.fundoForte : 'transparent',
        fillStyle: 'solid',
        strokeWidth: m ? 2 : 1,
        roughness: 0,
        roundness: null,
        ...(t ? { label: { text: t, fontSize: 13, strokeColor: c.p.texto, fontFamily: c.p.fonte } } : {}),
      });
    }
  }
  if (g.destaque.length) texto(c, x, oy + g.linhas * L + 6, `${g.destaque.length} de ${g.linhas * g.colunas} em destaque`, 13, c.p.destaque);
}

// ── Tabela ──────────────────────────────────────────────────────────────────

function tabela(c: Ctx, t: Tabela, x: number, y: number) {
  const cols = Math.max(t.cabecalho.length, ...t.linhas.map((l) => l.length));
  const larguras = Array.from({ length: cols }, (_, i) => larguraColunaTabela(t, i));
  const H = 36;
  const linhas = t.cabecalho.length ? [t.cabecalho, ...t.linhas] : t.linhas;
  linhas.forEach((ln, r) => {
    let cx = x;
    const cab = r === 0 && t.cabecalho.length > 0;
    for (let col = 0; col < cols; col++) {
      const w = larguras[col];
      const v = ln[col] ?? '';
      c.out.push({
        type: 'rectangle',
        x: cx,
        y: y + r * H,
        width: w,
        height: H,
        strokeColor: cab ? c.p.destaque : c.p.mutado,
        backgroundColor: cab ? c.p.fundoDestaque : col === 0 && v ? c.p.fundoInfo : 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        roundness: null,
        ...(v ? { label: { text: corta(v, Math.floor((w - 16) / 8.5)), fontSize: 14, strokeColor: c.p.texto, fontFamily: c.p.fonte } } : {}),
      });
      cx += w;
    }
  });
}

/** Desenha o diagrama em (x, y), com título em cima. `w`/`h` = tamanhoDiagrama + TOPO. */
export function diagramaParaEsqueletos(id: string, titulo: string, d: Diagrama, x: number, y: number, w: number, h: number, p: PaletaQuadro): Esqueleto[] {
  const c: Ctx = { out: [], p };
  if (titulo.trim()) texto(c, x, y, titulo, 16, p.texto);
  const cy = y + TOPO;
  // Moldura quase invisível com o id (as setas da cena se prendem nela).
  c.out.push({ type: 'rectangle', id, x: x - 8, y: cy - 8, width: w + 16, height: h - TOPO + 16, strokeColor: p.mutado, backgroundColor: 'transparent', strokeWidth: 1, strokeStyle: 'dotted', opacity: 35, roughness: 0, roundness: null });
  switch (d.tipo) {
    case 'arvore':
      arvore(c, d.dados, x, cy);
      break;
    case 'conjuntos':
      conjuntos(c, d.dados, x, cy, w, h - TOPO);
      break;
    case 'grade':
      grade(c, d.dados, x, cy);
      break;
    case 'tabela':
      tabela(c, d.dados, x, cy);
      break;
  }
  return c.out;
}

/** Quantas folhas tem a árvore (exportado pra testes e medidas). */
export const folhasDaArvore = (a: Arvore) => folhas(a.raiz);
