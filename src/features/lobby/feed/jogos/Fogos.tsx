import { useEffect, useRef, useState } from 'react';
import { ALTURA, Grade, LARGURA, semMovimento } from './ascii';

// Fogos e confete em ASCII. Aparece por cima do jogo quando a pessoa acerta e some sozinho.

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  char: string;
}

const FAISCA = ['*', '+', '·', '\'', '`', 'o'];

function explodir(cx: number, cy: number, chars: string[]): Particula[] {
  const out: Particula[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const v = 0.5 + Math.random() * 0.9;
    // A grade é mais alta que larga em pixels: achata o eixo y pra explosão ficar redonda.
    out.push({ x: cx, y: cy, vx: Math.cos(a) * v * 1.9, vy: Math.sin(a) * v, vida: 7 + Math.floor(Math.random() * 5), char: chars[Math.floor(Math.random() * chars.length)] });
  }
  return out;
}

function confete(chars: string[]): Particula[] {
  return Array.from({ length: 26 }, () => ({
    x: Math.random() * LARGURA,
    y: -Math.random() * 6,
    vx: (Math.random() - 0.5) * 0.6,
    vy: 0.35 + Math.random() * 0.5,
    vida: 24,
    char: chars[Math.floor(Math.random() * chars.length)],
  }));
}

/** `chave` muda a cada acerto (dispara de novo). `simbolos` são os caracteres do confete (do tema da matéria). */
export function Fogos({ chave, simbolos }: { chave: number; simbolos: string[] }) {
  const [quadro, setQuadro] = useState('');
  const parts = useRef<Particula[]>([]);

  useEffect(() => {
    if (!chave || semMovimento()) return;
    const pontos = Array.from({ length: 3 }, () => ({ x: 8 + Math.random() * (LARGURA - 16), y: 2 + Math.random() * 4 }));
    parts.current = [...pontos.flatMap((p) => explodir(p.x, p.y, FAISCA)), ...confete(simbolos.map((s) => s[0]))];
    let n = 0;
    const id = setInterval(() => {
      n++;
      const g = new Grade();
      parts.current = parts.current
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.04, vida: p.vida - 1 }))
        .filter((p) => p.vida > 0 && p.y < ALTURA);
      for (const p of parts.current) g.texto(p.x, Math.round(p.y), p.char);
      setQuadro(g.toString());
      if (n > 40 || parts.current.length === 0) {
        clearInterval(id);
        setQuadro('');
      }
    }, 90);
    return () => clearInterval(id);
  }, [chave, simbolos]);

  if (!quadro) return null;
  return (
    <pre aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-10 m-0 -translate-x-1/2 select-none overflow-hidden whitespace-pre font-mono text-[13px] leading-[1.1] text-warn">
      {quadro}
    </pre>
  );
}
