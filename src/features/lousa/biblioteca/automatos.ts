import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { LibraryItem } from '@excalidraw/excalidraw/types';

// Itens feitos aqui, porque não existem na comunidade:
//  - Autômatos (LFA): estados, transições, AFD pronto, fita de Turing, pilha.
//  - Selos das marcas que o pacote aberto de ícones não tem (ChatGPT, Grok, C#…).
// São descritos como "esqueleto" e o Excalidraw converte (ele mede o texto sozinho).

type Esqueleto = Parameters<typeof convertToExcalidrawElements>[0] extends (infer T)[] | null ? T : never;

const pts = (p: number[][]) => p as never; // o tipo de ponto do Excalidraw é "marcado"; aqui é só número
const CURVA = { roundness: { type: 2 as const } }; // laços curvos, como no quadro

function item(id: string, name: string, esqueleto: Esqueleto[]): LibraryItem {
  const elements = convertToExcalidrawElements(esqueleto, { regenerateIds: true });
  const grupo = `grp-${id}`;
  return {
    id,
    status: 'published',
    created: 1,
    name,
    elements: elements.map((e) => ({ ...e, groupIds: [grupo] })),
  };
}

const estado = (id: string, x: number, y: number, rotulo: string): Esqueleto => ({
  type: 'ellipse',
  id,
  x,
  y,
  width: 70,
  height: 70,
  strokeWidth: 2,
  label: { text: rotulo },
});

const anelFinal = (x: number, y: number): Esqueleto => ({ type: 'ellipse', x: x - 7, y: y - 7, width: 84, height: 84, strokeWidth: 2 });

export function itensAutomatos(): LibraryItem[] {
  return [
    item('automato:estado', 'Autômato: estado', [estado('a1', 0, 0, 'q0')]),
    item('automato:final', 'Autômato: estado final (aceitação)', [anelFinal(0, 0), estado('a2', 0, 0, 'qf')]),
    item('automato:inicial', 'Autômato: estado inicial', [
      estado('a3', 80, 0, 'q0'),
      { type: 'arrow', x: 0, y: 35, points: pts([[0, 0], [78, 0]]), end: { id: 'a3' } },
    ]),
    item('automato:transicao', 'Autômato: transição com símbolo', [
      estado('a4', 0, 0, 'q0'),
      estado('a5', 200, 0, 'q1'),
      { type: 'arrow', x: 72, y: 35, points: pts([[0, 0], [126, 0]]), start: { id: 'a4' }, end: { id: 'a5' }, label: { text: 'a' } },
    ]),
    item('automato:laco', 'Autômato: laço (transição pro mesmo estado)', [
      estado('a6', 0, 40, 'q0'),
      { type: 'arrow', x: 18, y: 42, points: pts([[0, 0], [-10, -40], [44, -40], [34, 0]]), label: { text: 'b' }, ...CURVA },
    ]),
    item('automato:afd', 'Autômato: AFD pronto (termina em 1)', [
      { type: 'arrow', x: 0, y: 75, points: pts([[0, 0], [58, 0]]), end: { id: 'b1' } },
      estado('b1', 60, 40, 'q0'),
      anelFinal(260, 40),
      estado('b2', 260, 40, 'q1'),
      { type: 'arrow', x: 132, y: 65, points: pts([[0, 0], [126, 0]]), start: { id: 'b1' }, end: { id: 'b2' }, label: { text: '1' } },
      { type: 'arrow', x: 258, y: 95, points: pts([[0, 0], [-126, 0]]), start: { id: 'b2' }, end: { id: 'b1' }, label: { text: '0' } },
      { type: 'arrow', x: 78, y: 42, points: pts([[0, 0], [-10, -38], [44, -38], [34, 0]]), label: { text: '0' }, ...CURVA },
      { type: 'arrow', x: 278, y: 34, points: pts([[0, 0], [-10, -38], [44, -38], [34, 0]]), label: { text: '1' }, ...CURVA },
    ]),
    item('automato:fita', 'Autômato: fita da Máquina de Turing', [
      ...['⊢', 'a', 'b', 'b', 'a', '□', '□'].map(
        (s, i): Esqueleto => ({ type: 'rectangle', x: i * 44, y: 50, width: 44, height: 44, label: { text: s } }),
      ),
      { type: 'arrow', x: 66, y: 0, points: pts([[0, 0], [0, 46]]), label: { text: 'cabeça' } },
    ]),
    item('automato:pilha', 'Autômato: pilha (autômato de pilha)', [
      ...['A', 'A', 'B', 'Z₀'].map(
        (s, i): Esqueleto => ({ type: 'rectangle', x: 0, y: i * 40, width: 90, height: 40, label: { text: s } }),
      ),
      { type: 'text', x: 100, y: 10, text: '← topo' },
    ]),
  ];
}

const SELOS: { nome: string; cor: string; grupo: string }[] = [
  { nome: 'ChatGPT', cor: '#10A37F', grupo: 'Logo IA' },
  { nome: 'OpenAI', cor: '#000000', grupo: 'Logo IA' },
  { nome: 'Grok', cor: '#000000', grupo: 'Logo IA' },
  { nome: 'C#', cor: '#9B4F96', grupo: 'Logo' },
  { nome: 'Java', cor: '#ED8B00', grupo: 'Logo' },
  { nome: 'VS Code', cor: '#007ACC', grupo: 'Logo' },
];

/** Selo com o nome na cor da marca (não imita o desenho do logo). */
export function itensSelos(): LibraryItem[] {
  return SELOS.map(({ nome, cor, grupo }) =>
    item(`selo:${nome}`, `${grupo}: ${nome}`, [
      {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 130,
        height: 48,
        backgroundColor: cor,
        strokeColor: cor,
        fillStyle: 'solid',
        roundness: { type: 3 },
        label: { text: nome, strokeColor: '#ffffff', fontSize: 22 },
      },
    ]),
  );
}
