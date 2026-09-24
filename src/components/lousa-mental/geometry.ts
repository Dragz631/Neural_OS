import type { FlowNode, Point, AnchorSide } from '../types';

export function anchorPointOf(node: FlowNode, side: AnchorSide): Point {
  switch (side) {
    case 'top':
      return { x: node.x + node.w / 2, y: node.y };
    case 'right':
      return { x: node.x + node.w, y: node.y + node.h / 2 };
    case 'bottom':
      return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'left':
      return { x: node.x, y: node.y + node.h / 2 };
  }
}

// Smooth cubic bezier between two anchor points. Control offset scales with
// the vertical distance so short links stay tight and long ones stay curvy.
export function bezier(a: Point, b: Point): string {
  const dy = Math.abs(b.y - a.y);
  const ctrl = Math.max(50, dy / 2);
  const sameVertical = Math.abs(a.y - b.y) < 24;
  if (sameVertical) {
    const dx = Math.abs(b.x - a.x);
    const c = Math.max(50, dx / 2);
    return `M ${a.x} ${a.y} C ${a.x + c} ${a.y}, ${b.x - c} ${b.y}, ${b.x} ${b.y}`;
  }
  const down = b.y > a.y;
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + (down ? ctrl : -ctrl)}, ${b.x} ${b.y - (down ? ctrl : -ctrl)}, ${b.x} ${b.y}`;
}

// Build a smooth quadratic-curve path from raw freehand points.
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

// Squared distance from point P to segment AB.
function distToSeg2(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return (p.x - cx) ** 2 + (p.y - cy) ** 2;
}

// Squared distance from a point to a polyline (used by the eraser).
export function distToPath2(p: Point, points: Point[]): number {
  if (points.length === 0) return Infinity;
  let min = (p.x - points[0].x) ** 2 + (p.y - points[0].y) ** 2;
  for (let i = 1; i < points.length; i++) {
    const d = distToSeg2(p, points[i - 1], points[i]);
    if (d < min) min = d;
  }
  return min;
}

// Point-erase: drop only the individual coordinates within `radius` of `p`,
// splitting the stroke into sub-strokes where gaps appear. Returns the
// resulting array of point arrays (empty array means the stroke is gone).
export function erasePointsAt(
  p: Point,
  points: Point[],
  radius: number,
): Point[][] {
  const r2 = radius * radius;
  const out: Point[][] = [];
  let run: Point[] = [];
  for (const pt of points) {
    const inside = (pt.x - p.x) ** 2 + (pt.y - p.y) ** 2 <= r2;
    if (inside) {
      if (run.length >= 2) out.push(run);
      run = [];
    } else {
      run.push(pt);
    }
  }
  if (run.length >= 2) out.push(run);
  return out;
}
