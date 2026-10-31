import type { Id, Subject, Topic } from './types';

// ─── Layout radial da Árvore Neural ──────────────────────────────────────────
// Centro = você. Cada matéria é um galho com um "setor" do círculo,
// proporcional a quantas folhas tem. Cada tópico fica mais pra fora conforme
// a profundidade (pré-requisito → tópico derivado). Parecido com os
// "destiny boards" de MMO: a árvore cresce pra fora conforme você aprende.

export interface TreeNode {
  id: Id;
  kind: 'root' | 'subject' | 'topic';
  label: string;
  x: number;
  y: number;
  color: string;
  topic?: Topic;
  subject?: Subject;
}

export interface TreeEdge {
  from: Id;
  to: Id;
  color: string;
}

const SUBJECT_RADIUS = 160;
const RING_STEP = 130;

export function layoutTree(subjects: Subject[], topics: Topic[]): { nodes: TreeNode[]; edges: TreeEdge[] } {
  const nodes: TreeNode[] = [{ id: 'root', kind: 'root', label: 'VOCÊ', x: 0, y: 0, color: 'var(--color-accent)' }];
  const edges: TreeEdge[] = [];
  if (subjects.length === 0) return { nodes, edges };

  const byParent = new Map<Id, Topic[]>();
  for (const t of topics) {
    // Tópico cujo pai sumiu vira filho direto da matéria.
    const parentOk = t.parentId && topics.some((p) => p.id === t.parentId);
    const key = parentOk ? t.parentId! : `subject:${t.subjectId}`;
    byParent.set(key, [...(byParent.get(key) ?? []), t]);
  }

  const children = (key: string) => byParent.get(key) ?? [];
  const leaves = (key: string): number => {
    const kids = children(key);
    return kids.length === 0 ? 1 : kids.reduce((sum, k) => sum + leaves(k.id), 0);
  };

  const totalLeaves = subjects.reduce((sum, s) => sum + leaves(`subject:${s.id}`), 0);
  // A primeira matéria fica centrada no topo (com uma matéria só, a árvore cresce pra cima).
  let angle = -Math.PI / 2 - (Math.PI * leaves(`subject:${subjects[0].id}`)) / totalLeaves;

  const place = (key: string, start: number, end: number, depth: number, color: string, parentId: Id) => {
    let cursor = start;
    const total = leaves(key);
    for (const t of children(key)) {
      const span = ((end - start) * leaves(t.id)) / total;
      const mid = cursor + span / 2;
      const r = SUBJECT_RADIUS + RING_STEP * depth;
      nodes.push({ id: t.id, kind: 'topic', label: t.title, x: r * Math.cos(mid), y: r * Math.sin(mid), color, topic: t });
      edges.push({ from: parentId, to: t.id, color });
      place(t.id, cursor, cursor + span, depth + 1, color, t.id);
      cursor += span;
    }
  };

  for (const s of subjects) {
    const key = `subject:${s.id}`;
    const span = (2 * Math.PI * leaves(key)) / totalLeaves;
    const mid = angle + span / 2;
    nodes.push({ id: s.id, kind: 'subject', label: s.name, x: SUBJECT_RADIUS * Math.cos(mid), y: SUBJECT_RADIUS * Math.sin(mid), color: s.color, subject: s });
    edges.push({ from: 'root', to: s.id, color: s.color });
    place(key, angle, angle + span, 1, s.color, s.id);
    angle += span;
  }

  return { nodes, edges };
}

/** Caixa que envolve todos os nós (pra enquadrar a árvore na tela). */
export function bounds(nodes: TreeNode[], pad = 60) {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  return { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minY: Math.min(...ys) - pad, maxY: Math.max(...ys) + pad };
}
