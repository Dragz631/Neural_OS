import { useEffect, useRef } from 'react';
import { misturar, rgbDe } from '../domain/tema';
import { cn } from '../lib/utils';
import { useTema } from '../store/tema';

// A orbe do professor (do Brazuka): anel pontilhado girando + estrela que vira
// "massinha com pontas" quando ele fala. Pixel art com dither ordenado (Bayer 4x4),
// desenhada por código. Movimento por molas. As cores vêm do tema (destaque = miolo).
// A geometria polar de cada pixel é calculada UMA vez; por quadro só 360 contornos.

export type EstadoOrbe = 'idle' | 'thinking' | 'speaking' | 'listening' | 'sleeping';

const N = 168;
const C = N / 2;
const BINS = 360;
const TAU = Math.PI * 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

type Rgb = [number, number, number];

class Mola {
  v: number;
  t: number;
  vel = 0;
  private k: number;
  private d: number;
  constructor(v: number, k = 140, d = 18) {
    this.v = v;
    this.t = v;
    this.k = k;
    this.d = d;
  }
  passo(dt: number) {
    this.vel += (this.k * (this.t - this.v) - this.d * this.vel) * dt;
    this.v += this.vel * dt;
    return this.v;
  }
}

interface Ponta {
  a: number;
  giro: number;
  larg: number;
  alcance: number;
  len: Mola;
  troca: number;
}

interface Paleta {
  miolo: Rgb;
  miolo2: Rgb;
  miolo3: Rgb;
  anel: Rgb;
  anel2: Rgb;
  alerta: Rgb;
  alerta2: Rgb;
}

const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Cores da orbe a partir do tema: destaque no miolo, texto no anel, aviso na pergunta pendente. */
function paletaDoTema(): Paleta {
  const c = useTema.getState().valores.cores;
  const bg = c.bg;
  return {
    miolo: rgbDe(c.accent),
    miolo2: misturar(c.accent, bg, 0.22),
    miolo3: misturar(c.accent, bg, 0.55),
    anel: rgbDe(c.fg),
    anel2: misturar(c.fg, bg, 0.4),
    alerta: rgbDe(c.warn),
    alerta2: misturar(c.warn, bg, 0.4),
  };
}

function criar(canvas: HTMLCanvasElement, lerEstado: () => EstadoOrbe, lerPendente: () => boolean) {
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const img = ctx.createImageData(N, N);
  const px = img.data;
  const RR = new Float32Array(N * N);
  const BIN = new Uint16Array(N * N);
  const TH = new Float32Array(N * N);
  const NX = new Float32Array(N * N);
  const NY = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const dx = x + 0.5 - C;
      const dy = y + 0.5 - C;
      const r = Math.hypot(dx, dy);
      RR[i] = r;
      NX[i] = r ? dx / r : 0;
      NY[i] = r ? dy / r : 0;
      BIN[i] = Math.round(((Math.atan2(dy, dx) + Math.PI) / TAU) * BINS) % BINS;
      TH[i] = BAYER[(y & 3) * 4 + (x & 3)];
    }
  const ANG = Float32Array.from({ length: BINS }, (_, b) => (b / BINS) * TAU - Math.PI);
  const base = new Float32Array(BINS);
  const total = new Float32Array(BINS);

  const PONTAS: Ponta[] = Array.from({ length: 14 }, (_, k) => ({
    a: (k / 14) * TAU + (Math.random() - 0.5) * 0.35,
    giro: (Math.random() - 0.5) * 0.25,
    larg: k % 3 === 0 ? 0.09 + Math.random() * 0.04 : 0.045 + Math.random() * 0.04,
    alcance: k % 3 === 0 ? 0.85 + Math.random() * 0.4 : 0.35 + Math.random() * 0.45,
    len: new Mola(0, 520, 20),
    troca: Math.random(),
  }));
  const parts: { x: number; y: number; vx: number; vy: number; vida: number }[] = [];
  const S = {
    forma: new Mola(0, 70, 14),
    nivel: new Mola(0, 420, 26),
    giro: new Mola(0.18, 30, 10),
    brilho: new Mola(1, 40, 12),
    alerta: new Mola(0, 60, 14),
  };
  let rot = 0;
  let t = 0;
  let ultimo = performance.now();
  let parado = false;
  let raf = 0;
  let pal = paletaDoTema();
  const desinscrever = useTema.subscribe((s, a) => {
    if (s.valores.cores !== a.valores.cores) pal = paletaDoTema();
  });

  const contornos = (dt: number, estado: EstadoOrbe) => {
    const b0 = N * 0.165 * (1 + Math.sin(t * 1.25) * 0.035) * (0.85 + 0.15 * S.brilho.v);
    const m = Math.min(1, Math.max(0, S.forma.v));
    const lv = Math.max(0, S.nivel.v);
    const p = 0.55 + 0.25 * m;
    const esc = (1.32 - 0.12 * m) * (1 - 0.22 * Math.min(1, lv * 1.4));
    const tremor = estado === 'thinking' ? 0.035 : 0;
    for (const sp of PONTAS) {
      sp.troca -= dt * (4 + lv * 10);
      if (sp.troca <= 0) {
        sp.troca = 1;
        sp.len.t = lv > 0.03 ? lv * sp.alcance * (0.45 + Math.random() * 0.75) : 0;
      }
      if (lv <= 0.03) sp.len.t = 0;
      sp.len.passo(dt);
    }
    for (let b = 0; b < BINS; b++) {
      const th = ANG[b];
      const c = Math.abs(Math.cos(th));
      const s = Math.abs(Math.sin(th));
      let r = b0 * esc * Math.pow(Math.pow(c, p) + Math.pow(s, p), -1 / p);
      if (tremor) r *= 1 + tremor * Math.sin(9 * th + t * 7);
      base[b] = r;
      let topo = r;
      for (const sp of PONTAS) {
        const L = Math.max(0, sp.len.v) * N * 0.55;
        if (L < 0.5) continue;
        let d = Math.abs(th - sp.a) % TAU;
        if (d > Math.PI) d = TAU - d;
        if (d >= sp.larg) continue;
        const h = r + L * (1 - d / sp.larg);
        if (h > topo) topo = h;
      }
      total[b] = topo;
    }
  };

  const quadro = (now: number) => {
    const dt = Math.min(0.05, (now - ultimo) / 1000);
    ultimo = now;
    t += dt;
    const estado = lerEstado();
    S.forma.t = estado === 'speaking' ? 1 : estado === 'thinking' ? 0.55 : 0;
    S.giro.t = ({ thinking: 1.1, speaking: 0.42, listening: 0.3, sleeping: 0.02, idle: 0.18 } as const)[estado];
    S.brilho.t = estado === 'sleeping' ? 0.38 : 1;
    // Sem áudio de verdade: quando "fala", o nível vem de um ritmo orgânico.
    S.nivel.t = estado === 'speaking' ? 0.45 + 0.35 * Math.sin(t * 9) * Math.sin(t * 3.7) + 0.15 * Math.sin(t * 17) : 0;
    S.alerta.t = lerPendente() ? 1 : 0;
    for (const k of Object.keys(S) as (keyof typeof S)[]) S[k].passo(dt);
    rot += S.giro.v * dt;
    for (const p of PONTAS) p.a += p.giro * dt * (0.2 + S.nivel.v * 1.5);
    contornos(dt, estado);
    const lv = Math.max(0, S.nivel.v);
    const br = S.brilho.v;
    if (lv > 0.35)
      for (const p of PONTAS) {
        if (p.len.v > 0.25 && Math.random() < lv * 0.18) {
          const r = total[Math.floor(((((p.a + Math.PI) % TAU) + TAU) % TAU) / TAU * BINS) % BINS];
          parts.push({ x: C + Math.cos(p.a) * r, y: C + Math.sin(p.a) * r, vx: Math.cos(p.a) * (18 + Math.random() * 30), vy: Math.sin(p.a) * (18 + Math.random() * 30), vida: 0.6 + Math.random() * 0.5 });
        }
      }
    const R = N * 0.405;
    const am = Math.min(1, Math.max(0, S.alerta.v)) * (0.65 + 0.35 * Math.sin(t * 6));
    const cr = mix(pal.anel, pal.alerta, am);
    const cr2 = mix(pal.anel2, pal.alerta2, am);
    const lacos = 48;
    for (let i = 0, j = 0; i < N * N; i++, j += 4) {
      const r = RR[i];
      const b = BIN[i];
      let cor: Rgb | null = null;
      const dr = r - R;
      if (dr > -1.8 && dr < 1.8) {
        const f = ((((ANG[b] - rot) / TAU) * lacos) % 1 + 1) % 1;
        const x = i % N;
        const y = (i / N) | 0;
        if (f < 0.72 && ((x + y) & 1) === 0) cor = Math.abs(dr) < 0.9 ? cr : cr2;
      }
      const bt = total[b];
      const bb = base[b];
      if (r >= bt && r < bb * 1.42) {
        const q = (r - bb) / (bb * 0.42);
        const lado = 0.5 + 0.5 * (NX[i] * 0.6 + NY[i] * 0.5);
        const I = 0.42 * (1 - q) * (0.35 + 0.65 * lado) * br;
        if (I + TH[i] * 0.55 > 0.72) cor = pal.miolo3;
      }
      if (r < bt) {
        const q = Math.min(1, r / bt);
        const nz = Math.sqrt(Math.max(0, 1 - q * q));
        const luz = nz * 0.55 - NX[i] * q * 0.45 - NY[i] * q * 0.55;
        const nucleo = r <= bb ? 0.22 * (1 - r / bb) : 0;
        let I = 0.24 + 0.76 * Math.max(0, luz + nucleo);
        if (r > bb) I = Math.max(I, 0.55 - 0.3 * ((r - bb) / Math.max(1, bt - bb)));
        I *= br;
        const lvl = Math.floor(I * 3 + TH[i]);
        if (lvl >= 3) cor = pal.miolo;
        else if (lvl === 2) cor = pal.miolo2;
        else if (lvl === 1) cor = pal.miolo3;
      }
      if (cor) {
        px[j] = cor[0];
        px[j + 1] = cor[1];
        px[j + 2] = cor[2];
        px[j + 3] = 255;
      } else px[j + 3] = 0;
    }
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      p.vida -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vida <= 0 || p.x < 0 || p.y < 0 || p.x >= N || p.y >= N) {
        parts.splice(k, 1);
        continue;
      }
      const j = ((p.y | 0) * N + (p.x | 0)) * 4;
      const c = p.vida > 0.4 ? pal.miolo : pal.miolo3;
      px[j] = c[0];
      px[j + 1] = c[1];
      px[j + 2] = c[2];
      px[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };

  const laco = (now: number) => {
    if (!parado) quadro(now);
    raf = requestAnimationFrame(laco);
  };
  raf = requestAnimationFrame(laco);
  const visivel = () => {
    parado = document.hidden;
    ultimo = performance.now();
  };
  document.addEventListener('visibilitychange', visivel);
  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', visivel);
    desinscrever();
  };
}

/** A orbe. Não aparece se a pessoa desligou no tema. */
export function Orbe({ estado = 'idle', pendente = false, tamanho = 96, className }: { estado?: EstadoOrbe; pendente?: boolean; tamanho?: number; className?: string }) {
  const ligada = useTema((s) => s.valores.orbe);
  const ref = useRef<HTMLCanvasElement>(null);
  const estadoRef = useRef(estado);
  const pendenteRef = useRef(pendente);
  estadoRef.current = estado;
  pendenteRef.current = pendente;

  useEffect(() => {
    if (!ligada || !ref.current) return;
    return criar(ref.current, () => estadoRef.current, () => pendenteRef.current);
  }, [ligada]);

  if (!ligada) return null;
  return <canvas ref={ref} aria-hidden style={{ width: tamanho, height: tamanho, imageRendering: 'pixelated' }} className={cn('shrink-0', className)} />;
}
