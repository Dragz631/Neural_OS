import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { Roadmap, TipoItem } from '../../domain/roadmap';
import type { Esqueleto } from '../professor/aulaParaQuadro';
import { paletaQuadro } from './temaQuadro';

// Desenha o roadmap no estilo do roadmap.sh: a espinha de etapas no meio, de cima
// pra baixo, e os assuntos de cada etapa nos dois lados, ligados por linhas.
//   cheio           = essencial
//   tracejado       = opcional
//   pontilhado      = escolha UMA entre as alternativas

const LARG_ETAPA = 270;
const ALT_ETAPA = 60;
const LARG_ITEM = 230;
const ALT_ITEM = 42;
const GAP_ITEM = 12;
const GAP_ETAPA = 70;
const GAP_LADO = 90; // da etapa até a coluna dos itens

export function roadmapParaElementos(roadmap: Roadmap) {
  const p = paletaQuadro();
  const rodar = p.arredondado ? ({ type: 3 } as const) : null;
  const esq: Esqueleto[] = [];

  esq.push({ type: 'text', x: 0, y: 0, text: `Roadmap: ${roadmap.materia}`, fontSize: 32, strokeColor: p.texto, fontFamily: p.fonte });
  esq.push({
    type: 'text',
    x: 0,
    y: 50,
    text: `cheio = essencial   ·   tracejado = opcional   ·   pontilhado = escolha uma${roadmap.objetivo ? `\nobjetivo: ${roadmap.objetivo}` : ''}`,
    fontSize: 15,
    strokeColor: p.mutado,
    fontFamily: p.fonte,
  });

  const estilo = (tipo: TipoItem) =>
    tipo === 'essencial'
      ? { strokeStyle: 'solid' as const, strokeColor: p.destaque, backgroundColor: p.fundoDestaque, strokeWidth: 2 }
      : tipo === 'opcional'
        ? { strokeStyle: 'dashed' as const, strokeColor: p.mutado, backgroundColor: 'transparent', strokeWidth: 2 }
        : { strokeStyle: 'dotted' as const, strokeColor: p.info, backgroundColor: p.fundoInfo, strokeWidth: 2 };

  const centroX = LARG_ITEM + GAP_LADO; // x do centro da espinha
  let y = 130;
  let fimAnterior: number | undefined;

  roadmap.etapas.forEach((etapa, i) => {
    // Metade dos itens à direita, metade à esquerda (alternando).
    const direita = etapa.itens.filter((_, k) => k % 2 === 0);
    const esquerda = etapa.itens.filter((_, k) => k % 2 === 1);
    const altLado = (n: number) => (n === 0 ? 0 : n * ALT_ITEM + (n - 1) * GAP_ITEM);
    const bloco = Math.max(ALT_ETAPA, altLado(direita.length), altLado(esquerda.length));
    const idEtapa = `rm-e${i}`;
    const xEtapa = centroX - LARG_ETAPA / 2;
    const yEtapa = y + (bloco - ALT_ETAPA) / 2;

    esq.push({
      type: 'rectangle',
      id: idEtapa,
      x: xEtapa,
      y: yEtapa,
      width: LARG_ETAPA,
      height: ALT_ETAPA,
      strokeColor: p.destaque,
      backgroundColor: p.fundoForte,
      fillStyle: 'solid',
      strokeWidth: 3,
      roughness: 0,
      roundness: rodar,
      label: { text: `${i + 1}. ${etapa.titulo}`, fontSize: 19, strokeColor: p.texto, fontFamily: p.fonte },
    });
    if (etapa.porque) {
      esq.push({ type: 'text', x: xEtapa, y: yEtapa + ALT_ETAPA + 4, text: etapa.porque.length > 46 ? `${etapa.porque.slice(0, 44)}…` : etapa.porque, fontSize: 12, strokeColor: p.mutado, fontFamily: p.fonte });
    }

    if (fimAnterior !== undefined) {
      const ini = fimAnterior + 22; // abaixo do "porque" da etapa de cima
      esq.push({
        type: 'arrow',
        x: centroX,
        y: ini,
        points: [[0, 0], [0, Math.max(20, yEtapa - 4 - ini)]] as never,
        strokeColor: p.destaque,
        strokeWidth: 3,
        roughness: 0,
        endArrowhead: 'arrow',
      } as Esqueleto);
    }

    const coluna = (itens: typeof etapa.itens, lado: 'd' | 'e') => {
      const topo = y + (bloco - altLado(itens.length)) / 2;
      itens.forEach((it, k) => {
        const id = `rm-e${i}-${lado}${k}`;
        const x = lado === 'd' ? centroX + LARG_ETAPA / 2 + GAP_LADO : centroX - LARG_ETAPA / 2 - GAP_LADO - LARG_ITEM;
        const yi = topo + k * (ALT_ITEM + GAP_ITEM);
        esq.push({ type: 'rectangle', id, x, y: yi, width: LARG_ITEM, height: ALT_ITEM, fillStyle: 'solid', roughness: 0, roundness: rodar, ...estilo(it.tipo), label: { text: it.titulo, fontSize: 15, strokeColor: p.texto, fontFamily: p.fonte } } as Esqueleto);
        const xa = lado === 'd' ? xEtapa + LARG_ETAPA : xEtapa;
        const xb = lado === 'd' ? x : x + LARG_ITEM;
        esq.push({
          type: 'arrow',
          x: xa,
          y: yEtapa + ALT_ETAPA / 2,
          points: [[0, 0], [xb - xa, yi + ALT_ITEM / 2 - (yEtapa + ALT_ETAPA / 2)]] as never,
          strokeColor: it.tipo === 'opcional' ? p.mutado : p.destaque,
          strokeStyle: it.tipo === 'essencial' ? 'solid' : 'dashed',
          strokeWidth: 2,
          roughness: 0,
          endArrowhead: null,
        } as Esqueleto);
      });
    };
    coluna(direita, 'd');
    coluna(esquerda, 'e');

    fimAnterior = yEtapa + ALT_ETAPA;
    y +=bloco + GAP_ETAPA + (etapa.porque ? 14 : 0);
  });

  return convertToExcalidrawElements(esq, { regenerateIds: true });
}
