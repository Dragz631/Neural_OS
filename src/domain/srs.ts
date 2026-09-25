import { addDays, toLocalDate } from './dates';
import type { LocalDate, ReviewState } from './types';

// ─── Revisão espaçada (SM-2 simplificado) ────────────────────────────────────
// Ideia: cada vez que você lembra bem de algo, a próxima revisão fica mais longe.
// Se esquece, volta pro começo. É o que faz o conteúdo "nunca sumir".

/** Como foi a revisão. */
export type Grade = 'errei' | 'dificil' | 'bom' | 'facil';

export const GRADE_LABEL: Record<Grade, string> = {
  errei: 'Esqueci',
  dificil: 'Difícil',
  bom: 'Lembrei',
  facil: 'Fácil',
};

export function newReviewState(today: LocalDate = toLocalDate()): ReviewState {
  return { ease: 2.5, intervalDays: 0, due: today, reps: 0, lapses: 0 };
}

export function applyGrade(state: ReviewState, grade: Grade, today: LocalDate = toLocalDate()): ReviewState {
  if (grade === 'errei') {
    return {
      ease: Math.max(1.3, state.ease - 0.2),
      intervalDays: 1,
      due: addDays(today, 1),
      reps: 0,
      lapses: state.lapses + 1,
    };
  }

  const easeDelta = grade === 'dificil' ? -0.15 : grade === 'facil' ? 0.15 : 0;
  const ease = Math.max(1.3, state.ease + easeDelta);

  let interval: number;
  if (state.reps === 0) interval = grade === 'facil' ? 3 : 1;
  else if (state.reps === 1) interval = grade === 'facil' ? 7 : 3;
  else interval = Math.round(state.intervalDays * ease * (grade === 'dificil' ? 0.8 : 1));

  interval = Math.max(1, interval);
  return { ease, intervalDays: interval, due: addDays(today, interval), reps: state.reps + 1, lapses: state.lapses };
}

/** Converte uma nota 0-100 (explicação, desafio) numa avaliação de revisão. */
export function gradeFromScore(score: number): Grade {
  if (score < 50) return 'errei';
  if (score < 70) return 'dificil';
  if (score < 90) return 'bom';
  return 'facil';
}

export function isDue(state: ReviewState, today: LocalDate = toLocalDate()): boolean {
  return state.due <= today; // comparação de string funciona porque o formato é AAAA-MM-DD
}

/** Domínio sobe com acertos e cai com esquecimentos; limitado a 0-100. */
export function nextMastery(current: number, grade: Grade): number {
  const delta = { errei: -15, dificil: 5, bom: 12, facil: 20 }[grade];
  return Math.min(100, Math.max(0, current + delta));
}
