import type { CartaoEscolha } from '../../../../domain/cartoes';
import { hashTexto } from './tema';

// Regras puras dos jogos do Feed (sem tela): ficam fora dos componentes pro recarregamento
// rápido do Vite não se perder.

export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/** A resposta certa dá forca? Termo curto, até 3 palavras, quase só letras. */
export function cabeForca(c: CartaoEscolha): boolean {
  const r = (c.opcoes[c.certa] ?? '').trim();
  if (r.length < 3 || r.length > 18 || r.split(/\s+/).length > 3) return false;
  const letras = semAcento(r).replace(/[^A-Z]/g, '').length;
  return letras >= 3 && letras / r.replace(/\s/g, '').length >= 0.8 && !c.codigo;
}

/** "Monte em ordem": embaralha estável pelo id do cartão (o mesmo cartão sempre vem igual) e nunca na ordem certa. */
export function embaralharPassos(id: string, n: number): number[] {
  const ordem = Array.from({ length: n }, (_, i) => i);
  let semente = hashTexto(id) || 1;
  for (let i = n - 1; i > 0; i--) {
    semente = (semente * 1103515245 + 12345) >>> 0;
    const j = semente % (i + 1);
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  if (n > 1 && ordem.every((v, i) => v === i)) ordem.push(ordem.shift()!);
  return ordem;
}
