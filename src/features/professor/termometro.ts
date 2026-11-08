import type { Lesson } from '../../domain/types';

// Termômetro da aula (lógica, sem tela): quais são as partes e o que o 😕 pede ao professor.

export interface ParteAula {
  id: string;
  texto: string;
}

/** As partes da aula: os blocos do desenho; sem desenho, os pontos-chave. */
export function partesDaAula(lesson: Lesson): ParteAula[] {
  const doDesenho = (lesson.cena?.elementos ?? []).filter((e) => e.texto.trim()).map((e) => ({ id: e.id, texto: e.texto.trim() }));
  if (doDesenho.length) return doDesenho.slice(0, 12);
  return lesson.keyPoints.slice(0, 8).map((k, i) => ({ id: `ponto-${i}`, texto: k }));
}

export const pedidoConfuso = (texto: string) => `Não entendi esta parte: "${texto}". Explica de outro jeito, mais fácil, e desenha se ajudar.`;
