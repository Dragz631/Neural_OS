import { posicionar, type Cena, type ElementoCena, type PapelCena } from '../../domain/cena';
import { paletaQuadro, type PaletaQuadro } from '../lousa/temaQuadro';
import type { Esqueleto } from './aulaParaQuadro';
import { graficoParaEsqueletos } from './graficoParaQuadro';

// Desenha a cena que o professor escolheu. Ele diz linha e coluna; aqui saem as
// medidas, as cores (pelo papel, do tema) e as setas amarradas nas caixas.

/** Quebra em linhas de até `max` letras (sem cortar palavra). */
function quebrarCena(texto: string, max: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    if (atual && (atual + ' ' + palavra).length > max) {
      linhas.push(atual);
      atual = palavra;
    } else atual = atual ? `${atual} ${palavra}` : palavra;
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [''];
}

const LARGURA_MAX: Record<ElementoCena['tipo'], number> = { caixa: 24, losango: 16, estado: 11, 'estado-final': 11, nota: 26, texto: 32, formula: 26, destaque: 26, grafico: 40 };
const FONTE = 18;
const LETRA = 11; // largura média de uma letra a 18px
const LINHA = FONTE * 1.3;

interface Medida {
  texto: string;
  w: number;
  h: number;
}

function medir(el: ElementoCena): Medida {
  if (el.tipo === 'grafico') return { texto: el.texto, w: 500, h: 400 };
  const linhas = quebrarCena(el.texto, LARGURA_MAX[el.tipo]);
  const maior = Math.max(...linhas.map((l) => l.length));
  const tw = Math.max(90, maior * LETRA);
  const th = linhas.length * LINHA;
  let w = tw + 44;
  let h = th + 32;
  if (el.tipo === 'losango') {
    w = tw * 1.55 + 40;
    h = th * 2 + 70;
  } else if (el.tipo === 'estado' || el.tipo === 'estado-final') {
    w = h = Math.max(w, h, 130) + 20;
  } else if (el.tipo === 'texto') {
    w = tw;
    h = th;
  }
  return { texto: linhas.join('\n'), w: Math.round(w), h: Math.round(h) };
}

interface Cores {
  traco: string;
  fundo: string;
  grossura: number;
}

function coresDo(papel: PapelCena, p: PaletaQuadro): Cores {
  switch (papel) {
    case 'conceito':
      return { traco: p.destaque, fundo: p.fundoDestaque, grossura: 2 };
    case 'resultado':
      return { traco: p.destaque, fundo: p.fundoForte, grossura: 4 };
    case 'exemplo':
      return { traco: p.info, fundo: p.fundoInfo, grossura: 2 };
    case 'erro':
      return { traco: p.perigo, fundo: p.fundoPerigo, grossura: 2 };
    case 'dica':
      return { traco: p.aviso, fundo: p.fundoAviso, grossura: 2 };
    case 'entrada':
    case 'saida':
      return { traco: p.info, fundo: 'transparent', grossura: 2 };
    default:
      return { traco: p.texto, fundo: 'transparent', grossura: 2 };
  }
}

export interface CenaDesenhada {
  esqueletos: Esqueleto[];
  largura: number;
  altura: number;
}

export function cenaParaEsqueletos(titulo: string, cena: Cena): CenaDesenhada {
  const p = paletaQuadro();
  const colocados = posicionar(cena);
  const medidas = new Map(colocados.map(({ el }) => [el.id, medir(el)]));

  // Largura de cada coluna e altura de cada linha = a do maior elemento dela.
  const larg = new Map<number, number>();
  const alt = new Map<number, number>();
  for (const { el, linha, coluna } of colocados) {
    const m = medidas.get(el.id)!;
    larg.set(coluna, Math.max(larg.get(coluna) ?? 0, m.w));
    alt.set(linha, Math.max(alt.get(linha) ?? 0, m.h));
  }
  const GAP_X = 130;
  const GAP_Y = 110;
  const colunas = [...larg.keys()].sort((a, b) => a - b);
  const linhas = [...alt.keys()].sort((a, b) => a - b);
  const x0 = new Map<number, number>();
  const y0 = new Map<number, number>();
  let ax = 0;
  for (const c of colunas) {
    x0.set(c, ax);
    ax += larg.get(c)! + GAP_X;
  }
  let ay = 0;
  for (const l of linhas) {
    y0.set(l, ay);
    ay += alt.get(l)! + GAP_Y;
  }

  const topo = 110; // espaço pro título
  const esq: Esqueleto[] = [];
  esq.push({ type: 'text', x: 0, y: 0, text: titulo, fontSize: 32, strokeColor: p.texto, fontFamily: p.fonte });
  if (cena.porque) esq.push({ type: 'text', x: 0, y: 52, text: `Desenhei assim porque ${cena.porque.charAt(0).toLowerCase()}${cena.porque.slice(1)}`, fontSize: 16, strokeColor: p.mutado, fontFamily: p.fonte });

  const posDe = new Map<string, { x: number; y: number; w: number; h: number }>();
  const rodar = p.arredondado ? ({ type: 3 } as const) : null;
  for (const { el, linha, coluna } of colocados) {
    const m = medidas.get(el.id)!;
    const x = x0.get(coluna)! + (larg.get(coluna)! - m.w) / 2;
    const y = topo + y0.get(linha)! + (alt.get(linha)! - m.h) / 2;
    posDe.set(el.id, { x, y, w: m.w, h: m.h });
    const c = coresDo(el.papel, p);
    const rotulo = { text: m.texto, fontSize: FONTE, strokeColor: p.texto, fontFamily: p.fonte };
    const comum = { id: el.id, x, y, width: m.w, height: m.h, strokeColor: c.traco, backgroundColor: c.fundo, fillStyle: 'solid' as const, strokeWidth: c.grossura, roughness: 0 };
    switch (el.tipo) {
      case 'grafico':
        if (el.grafico) esq.push(...graficoParaEsqueletos(el.id, m.texto, el.grafico, x, y, m.w, m.h, p));
        break;
      case 'losango':
        esq.push({ type: 'diamond', ...comum, label: rotulo });
        break;
      case 'estado':
        esq.push({ type: 'ellipse', ...comum, label: rotulo });
        break;
      case 'estado-final': {
        esq.push({ type: 'ellipse', ...comum, label: rotulo });
        // Anel duplo: a marca de "estado final" dos autômatos.
        esq.push({ type: 'ellipse', x: x - 10, y: y - 10, width: m.w + 20, height: m.h + 20, strokeColor: c.traco, backgroundColor: 'transparent', strokeWidth: 2, roughness: 0 });
        break;
      }
      case 'texto':
        esq.push({ type: 'text', id: el.id, x, y, text: m.texto, fontSize: FONTE, strokeColor: c.traco === p.texto ? p.texto : c.traco, fontFamily: p.fonte });
        break;
      case 'destaque':
        esq.push({ type: 'rectangle', ...comum, backgroundColor: 'transparent', strokeStyle: 'dashed', strokeWidth: 3, strokeColor: c.traco === p.texto ? p.destaque : c.traco, roundness: rodar, label: rotulo });
        break;
      case 'formula':
        esq.push({ type: 'rectangle', ...comum, roundness: null, label: { ...rotulo, fontSize: 22, fontFamily: 3 } });
        break;
      case 'nota':
        esq.push({ type: 'rectangle', ...comum, backgroundColor: c.fundo === 'transparent' ? p.fundoAviso : c.fundo, strokeColor: c.traco === p.texto ? p.aviso : c.traco, roundness: rodar, label: rotulo });
        break;
      default:
        esq.push({ type: 'rectangle', ...comum, roundness: rodar, label: rotulo });
    }
  }

  for (const l of cena.ligacoes) {
    const a = posDe.get(l.de);
    const b = posDe.get(l.para);
    if (!a || !b) continue;
    // Ponta a ponta pelas bordas que se olham (o Excalidraw não calcula isso sozinho no esqueleto).
    const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const dx = cb.x - ca.x;
    const dy = cb.y - ca.y;
    const horizontal = Math.abs(dx) * 0.7 > Math.abs(dy);
    const FOLGA = 6;
    const ini = horizontal ? { x: dx > 0 ? a.x + a.w + FOLGA : a.x - FOLGA, y: ca.y } : { x: ca.x, y: dy > 0 ? a.y + a.h + FOLGA : a.y - FOLGA };
    const fim = horizontal ? { x: dx > 0 ? b.x - FOLGA : b.x + b.w + FOLGA, y: cb.y } : { x: cb.x, y: dy > 0 ? b.y - FOLGA : b.y + b.h + FOLGA };
    esq.push({
      type: 'arrow',
      x: ini.x,
      y: ini.y,
      points: [[0, 0], [fim.x - ini.x, fim.y - ini.y]] as never,
      start: { id: l.de },
      end: { id: l.para },
      strokeColor: p.texto,
      strokeStyle: l.tracejada ? 'dashed' : 'solid',
      strokeWidth: 2,
      roughness: 0,
      endArrowhead: 'arrow',
      ...(l.rotulo ? { label: { text: l.rotulo, fontSize: 16, strokeColor: p.mutado, fontFamily: p.fonte } } : {}),
    } as Esqueleto);
  }

  // O "olha aqui" do giz: comentário ao lado do elemento.
  for (const a of cena.anotacoes) {
    const alvo = posDe.get(a.em);
    if (!alvo) continue;
    esq.push({ type: 'text', x: alvo.x + alvo.w + 24, y: alvo.y - 6, text: `← ${quebrarCena(a.texto, 26).join('\n')}`, fontSize: 16, strokeColor: p.aviso, fontFamily: p.fonte });
  }

  return { esqueletos: esq, largura: Math.max(ax - GAP_X, 600), altura: topo + ay - GAP_Y };
}
