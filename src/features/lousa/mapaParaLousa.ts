import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { MapaMateria } from '../../domain/mapa';

// Desenha o mapa de uma matéria na Lousa: a matéria em cima, cada tópico numa
// caixa no nível da sua profundidade, e setas do pré-requisito pro tópico.
// O Hugo aprende pelo mapa geral primeiro: é exatamente isso, desenhado.

type Esqueleto = Parameters<typeof convertToExcalidrawElements>[0] extends (infer T)[] | null ? T : never;

const LARGURA = 200;
const ALTURA = 60;
const ESPACO_X = 40;
const ESPACO_Y = 90;

export function mapaParaElementos(mapa: MapaMateria) {
  // Profundidade de cada tópico (raiz da matéria = 0).
  const prof: number[] = [];
  mapa.topicos.forEach((t, i) => {
    prof[i] = t.pai !== undefined ? prof[t.pai] + 1 : 1;
  });
  const porNivel = new Map<number, number[]>();
  prof.forEach((p, i) => porNivel.set(p, [...(porNivel.get(p) ?? []), i]));
  const maiorNivel = Math.max(...[...porNivel.values()].map((l) => l.length));
  const larguraTotal = maiorNivel * (LARGURA + ESPACO_X);

  const posicao = (i: number) => {
    const nivel = porNivel.get(prof[i])!;
    const k = nivel.indexOf(i);
    const larguraNivel = nivel.length * (LARGURA + ESPACO_X) - ESPACO_X;
    return { x: (larguraTotal - larguraNivel) / 2 + k * (LARGURA + ESPACO_X), y: prof[i] * (ALTURA + ESPACO_Y) };
  };

  const esqueleto: Esqueleto[] = [
    {
      type: 'rectangle',
      id: 'mapa-raiz',
      x: (larguraTotal - LARGURA * 1.4) / 2,
      y: 0,
      width: LARGURA * 1.4,
      height: ALTURA,
      strokeWidth: 2,
      roundness: { type: 3 },
      label: { text: mapa.materia, fontSize: 24 },
    },
  ];

  mapa.topicos.forEach((t, i) => {
    const { x, y } = posicao(i);
    esqueleto.push({ type: 'rectangle', id: `mapa-${i}`, x, y, width: LARGURA, height: ALTURA, roundness: { type: 3 }, label: { text: `${i + 1}. ${t.titulo}`, fontSize: 16 } });
    const origem = t.pai !== undefined ? `mapa-${t.pai}` : 'mapa-raiz';
    const de = t.pai !== undefined ? posicao(t.pai) : { x: (larguraTotal - LARGURA) / 2, y: 0 };
    const x0 = de.x + LARGURA / 2;
    const y0 = de.y + ALTURA;
    esqueleto.push({
      type: 'arrow',
      x: x0,
      y: y0,
      points: [
        [0, 0],
        [x + LARGURA / 2 - x0, y - y0],
      ] as never,
      start: { id: origem },
      end: { id: `mapa-${i}` },
    });
  });

  return convertToExcalidrawElements(esqueleto, { regenerateIds: true });
}
