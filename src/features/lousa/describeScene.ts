import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

// Transforma a lousa em texto que a IA entende:
//   - cada caixa/forma com o texto que tem dentro
//   - textos soltos
//   - setas como "A → B" (ou "A → ?" se a ponta não estiver presa em nada)
//   - quadros (frames) agrupando o conteúdo
// Pura e sem React, pra dar pra testar e reaproveitar.

type El = ExcalidrawElement & {
  text?: string;
  name?: string | null;
  containerId?: string | null;
  frameId?: string | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
};

const SHAPE_NAME: Record<string, string> = {
  rectangle: 'caixa',
  diamond: 'losango',
  ellipse: 'elipse',
  frame: 'quadro',
  magicframe: 'quadro',
  image: 'imagem',
  freedraw: 'rabisco',
  line: 'linha',
  embeddable: 'página incorporada',
};

export function describeScene(elements: readonly ExcalidrawElement[]): { text: string; counts: { shapes: number; arrows: number; texts: number } } {
  const els = (elements as readonly El[]).filter((e) => !e.isDeleted);
  const byId = new Map(els.map((e) => [e.id, e]));

  // Texto dentro de forma (bound text) vira o rótulo da forma.
  const labelOf = new Map<string, string>();
  for (const e of els) if (e.type === 'text' && e.containerId) labelOf.set(e.containerId, (e.text ?? '').trim());

  const label = (id?: string | null) => {
    if (!id) return '?';
    const e = byId.get(id);
    if (!e) return '?';
    return labelOf.get(id) || (e.type === 'text' ? (e.text ?? '').trim() : '') || e.name || SHAPE_NAME[e.type] || e.type;
  };

  const lines: string[] = [];
  const shapes = els.filter((e) => e.type !== 'text' && e.type !== 'arrow' && e.type !== 'freedraw' && e.type !== 'line');
  const loose = els.filter((e) => e.type === 'text' && !e.containerId && e.text?.trim());
  const arrows = els.filter((e) => e.type === 'arrow');

  const frames = shapes.filter((e) => e.type === 'frame' || e.type === 'magicframe');
  for (const f of frames) {
    const inside = els.filter((e) => e.frameId === f.id && e.type !== 'arrow').map((e) => label(e.id)).filter((t) => t && t !== '?');
    lines.push(`Quadro "${f.name || 'sem nome'}": ${inside.join(' | ') || '(vazio)'}`);
  }

  for (const s of shapes) {
    if (s.type === 'frame' || s.type === 'magicframe') continue;
    lines.push(`- ${SHAPE_NAME[s.type] ?? s.type}: ${labelOf.get(s.id) || '(sem texto)'}`);
  }
  for (const t of loose) lines.push(`- texto solto: ${t.text!.trim()}`);
  for (const a of arrows) {
    const mid = labelOf.get(a.id);
    lines.push(`- seta: ${label(a.startBinding?.elementId)} → ${label(a.endBinding?.elementId)}${mid ? ` (${mid})` : ''}`);
  }
  const doodles = els.filter((e) => e.type === 'freedraw').length;
  if (doodles) lines.push(`- ${doodles} rabisco(s) à mão livre (não dá pra ler o conteúdo)`);

  return {
    text: lines.join('\n') || '(lousa vazia)',
    counts: { shapes: shapes.length, arrows: arrows.length, texts: loose.length + labelOf.size },
  };
}
