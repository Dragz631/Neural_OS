import type { Grafico, PapelCena } from '../../domain/cena';
import { compilarExpressao, type Funcao } from '../../domain/expressao';
import type { PaletaQuadro } from '../lousa/temaQuadro';
import type { Esqueleto } from './aulaParaQuadro';

// Desenha um plano cartesiano (estilo Desmos) como elementos do Excalidraw: grade, eixos
// com setas, números, curvas das funções, pontos e legenda. Tudo vetorial e editável.

const CICLO: PapelCena[] = ['conceito', 'exemplo', 'dica', 'erro'];

function cor(p: PaletaQuadro, papel: PapelCena): string {
  switch (papel) {
    case 'conceito':
    case 'resultado':
    case 'passo':
      return p.destaque;
    case 'exemplo':
    case 'entrada':
    case 'saida':
      return p.info;
    case 'dica':
      return p.aviso;
    case 'erro':
      return p.perigo;
    default:
      return p.texto;
  }
}

/** Passo "redondo" (1, 2, 5 × 10^k) pra ter uns 6 marcadores no eixo. */
export function passoBonito(intervalo: number): number {
  const bruto = intervalo / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

const formatar = (v: number) => String(Math.round(v * 1000) / 1000);

/** Janela vertical automática: ignora os extremos (assíntotas) e dá uma folga. */
function janelaY(fs: Funcao[], pontosY: number[], xmin: number, xmax: number): [number, number] {
  const ys: number[] = [...pontosY];
  for (const f of fs) {
    for (let k = 0; k <= 200; k++) {
      const y = f(xmin + ((xmax - xmin) * k) / 200);
      if (Number.isFinite(y)) ys.push(y);
    }
  }
  if (ys.length === 0) return [-6, 6];
  ys.sort((a, b) => a - b);
  let lo = ys[Math.floor(ys.length * 0.03)];
  let hi = ys[Math.ceil(ys.length * 0.97) - 1];
  if (!(hi > lo)) {
    lo -= 1;
    hi += 1;
  }
  const folga = (hi - lo) * 0.1;
  return [lo - folga, hi + folga];
}

export function graficoParaEsqueletos(id: string, titulo: string, g: Grafico, x: number, y: number, w: number, h: number, p: PaletaQuadro): Esqueleto[] {
  const out: Esqueleto[] = [];
  const compiladas = g.funcoes.map((f) => ({ f, c: compilarExpressao(f.expr) })).filter((o) => o.c);
  const funcs = compiladas.flatMap((o) => (o.c!.tipo === 'funcao' ? [o.c!.f] : []));
  const [ymin, ymax] = g.ymin !== undefined && g.ymax !== undefined ? [g.ymin, g.ymax] : janelaY(funcs, g.pontos.map((q) => q.y), g.xmin, g.xmax);

  // Moldura e área do desenho.
  const topo = 26;
  const fy = y + topo;
  const fh = h - topo;
  const L = 38;
  const B = 24;
  const T = 10;
  const R = 12;
  const px = x + L;
  const py = fy + T;
  const pw = w - L - R;
  const ph = fh - T - B;
  const sx = (v: number) => px + ((v - g.xmin) / (g.xmax - g.xmin)) * pw;
  const sy = (v: number) => py + ph - ((v - ymin) / (ymax - ymin)) * ph;

  out.push({ type: 'text', x, y, text: titulo, fontSize: 16, strokeColor: p.texto, fontFamily: p.fonte });
  out.push({ type: 'rectangle', id, x, y: fy, width: w, height: fh, strokeColor: p.mutado, backgroundColor: 'transparent', strokeWidth: 1, roughness: 0, roundness: null });

  const linha = (x0: number, y0: number, dx: number, dy: number, extra: Record<string, unknown>) =>
    out.push({ type: 'line', x: x0, y: y0, points: [[0, 0], [dx, dy]] as never, roughness: 0, roundness: null, ...extra } as Esqueleto);

  // Grade e números.
  const pxStep = passoBonito(g.xmax - g.xmin);
  const pyStep = passoBonito(ymax - ymin);
  for (let v = Math.ceil(g.xmin / pxStep) * pxStep; v <= g.xmax + 1e-9; v += pxStep) {
    const gx = sx(v);
    linha(gx, py, 0, ph, { strokeColor: p.mutado, strokeWidth: 1, opacity: 22 });
    if (Math.abs(v) > 1e-9) out.push({ type: 'text', x: gx - (formatar(v).length * 6.5) / 2, y: py + ph + 5, text: formatar(v), fontSize: 12, strokeColor: p.mutado, fontFamily: p.fonte });
  }
  for (let v = Math.ceil(ymin / pyStep) * pyStep; v <= ymax + 1e-9; v += pyStep) {
    const gy = sy(v);
    linha(px, gy, pw, 0, { strokeColor: p.mutado, strokeWidth: 1, opacity: 22 });
    if (Math.abs(v) > 1e-9) out.push({ type: 'text', x: px - 6 - formatar(v).length * 6.5, y: gy - 7, text: formatar(v), fontSize: 12, strokeColor: p.mutado, fontFamily: p.fonte });
  }

  // Eixos com seta: no zero se ele está na janela, senão na borda.
  const eixoY = ymin <= 0 && ymax >= 0 ? sy(0) : py + ph;
  const eixoX = g.xmin <= 0 && g.xmax >= 0 ? sx(0) : px;
  out.push({ type: 'arrow', x: px, y: eixoY, points: [[0, 0], [pw, 0]] as never, strokeColor: p.texto, strokeWidth: 2, roughness: 0, endArrowhead: 'arrow', startArrowhead: null } as Esqueleto);
  out.push({ type: 'arrow', x: eixoX, y: py + ph, points: [[0, 0], [0, -ph]] as never, strokeColor: p.texto, strokeWidth: 2, roughness: 0, endArrowhead: 'arrow', startArrowhead: null } as Esqueleto);
  out.push({ type: 'text', x: px + pw - 10, y: eixoY + 4, text: 'x', fontSize: 13, strokeColor: p.texto, fontFamily: p.fonte });
  out.push({ type: 'text', x: eixoX + 6, y: py - 2, text: 'y', fontSize: 13, strokeColor: p.texto, fontFamily: p.fonte });
  if (g.xmin <= 0 && g.xmax >= 0 && ymin <= 0 && ymax >= 0) out.push({ type: 'text', x: sx(0) - 12, y: sy(0) + 3, text: '0', fontSize: 12, strokeColor: p.mutado, fontFamily: p.fonte });

  // Curvas. Quebra onde a função some da janela ou dá um salto (tan, 1/x).
  const N = 260;
  compiladas.forEach(({ f, c }, i) => {
    const papel = f.papel ?? CICLO[i % CICLO.length];
    const estilo = { strokeColor: cor(p, papel), strokeWidth: 3, strokeStyle: f.tracejada ? 'dashed' : 'solid' } as const;
    if (c!.tipo === 'vertical') {
      if (c!.x >= g.xmin && c!.x <= g.xmax) linha(sx(c!.x), py, 0, ph, { ...estilo, strokeStyle: 'dashed' });
      return;
    }
    const fn = c!.f;
    let seg: [number, number][] = [];
    const fecha = () => {
      if (seg.length >= 2) {
        const [x0, y0] = seg[0];
        out.push({ type: 'line', x: x0, y: y0, points: seg.map(([a, b]) => [a - x0, b - y0]) as never, roughness: 0, roundness: null, ...estilo } as Esqueleto);
      }
      seg = [];
    };
    let anterior: number | null = null;
    for (let k = 0; k <= N; k++) {
      const xv = g.xmin + ((g.xmax - g.xmin) * k) / N;
      const yv = fn(xv);
      const dentro = Number.isFinite(yv) && yv >= ymin && yv <= ymax;
      if (!dentro || (anterior !== null && Math.abs(yv - anterior) > (ymax - ymin) * 0.7)) fecha();
      if (dentro) seg.push([sx(xv), sy(yv)]);
      anterior = Number.isFinite(yv) ? yv : null;
    }
    fecha();
  });

  // Pontos marcados.
  for (const q of g.pontos) {
    if (q.x < g.xmin || q.x > g.xmax || q.y < ymin || q.y > ymax) continue;
    const c = cor(p, q.papel ?? 'resultado');
    out.push({ type: 'ellipse', x: sx(q.x) - 5, y: sy(q.y) - 5, width: 10, height: 10, strokeColor: c, backgroundColor: c, fillStyle: 'solid', strokeWidth: 2, roughness: 0 });
    if (q.rotulo) out.push({ type: 'text', x: sx(q.x) + 8, y: sy(q.y) - 20, text: q.rotulo, fontSize: 14, strokeColor: c, fontFamily: p.fonte });
  }

  // Legenda: cada função na cor da sua curva.
  compiladas.forEach(({ f }, i) => {
    const papel = f.papel ?? CICLO[i % CICLO.length];
    const nome = f.rotulo ?? (/^\s*(y|f\(x\)|x)\s*=/i.test(f.expr) ? f.expr.trim() : `y = ${f.expr.trim()}`);
    out.push({ type: 'text', x: px + 8, y: py + 6 + i * 18, text: nome, fontSize: 14, strokeColor: cor(p, papel), fontFamily: p.fonte });
  });

  return out;
}
