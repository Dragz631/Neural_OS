import { useEffect, useState } from 'react';

// Motor mínimo de ASCII: uma grade de caracteres que os jogos desenham a cada tick.

export const LARGURA = 42;
export const ALTURA = 13;

export class Grade {
  private linhas: string[][];
  w: number;
  h: number;
  constructor(w = LARGURA, h = ALTURA) {
    this.w = w;
    this.h = h;
    this.linhas = Array.from({ length: h }, () => Array.from({ length: w }, () => ' '));
  }
  /** Escreve um texto a partir de (x, y); o que passar da borda é cortado. Espaço não apaga. */
  texto(x: number, y: number, s: string, apagar = false) {
    if (y < 0 || y >= this.h) return;
    for (let i = 0; i < s.length; i++) {
      const cx = Math.round(x) + i;
      if (cx < 0 || cx >= this.w) continue;
      if (s[i] !== ' ' || apagar) this.linhas[y][cx] = s[i];
    }
  }
  /** Desenha um sprite de várias linhas. */
  sprite(x: number, y: number, linhas: string[]) {
    linhas.forEach((l, i) => this.texto(x, y + i, l));
  }
  toString() {
    return this.linhas.map((l) => l.join('')).join('\n');
  }
}

/** Quem pediu menos movimento no tema (ou o sistema) recebe o quadro final, sem animação. */
export function semMovimento(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.mov === 'nenhum' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Contador de quadros (~8 por segundo). Para sozinho quando `ativo` é falso. */
export function useQuadros(ativo = true, ms = 120): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!ativo || semMovimento()) return;
    const id = setInterval(() => setT((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ativo, ms]);
  return t;
}

/** Atalhos de teclado do jogo (ignora quando a pessoa está digitando em outro lugar). */
export function useTeclas(tratar: (tecla: string) => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)) return;
      // Enter/espaço fora de um botão é do jogo. Sem isso, o Enter que responde também "clica"
      // o botão Próximo que aparece já focado, e a pessoa pula a explicação sem ver.
      if ((e.key === 'Enter' || e.key === ' ') && !(alvo instanceof Element && alvo.closest('button, a'))) e.preventDefault();
      tratar(e.key.toLowerCase());
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [tratar]);
}
