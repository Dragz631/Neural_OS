import type { Id, LocalDate, Topic } from './types';

// Ligação do dia: um insight curto ligando dois tópicos de matérias diferentes
// que o Hugo já estudou. Conhecimento ligado é conhecimento que fica.

export interface LigacaoDoDia {
  data: LocalDate;
  aId: Id;
  bId: Id;
  /** Texto da IA. Sem IA (ou se ela falhar), fica a pergunta "como X se liga a Y?". */
  texto?: string;
}

/** Número estável pra data (mesmo dia = mesmo par). */
function semente(data: LocalDate): number {
  return [...data].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

/** Escolhe o par do dia: A entre os 5 estudados mais recentes, B de outra matéria. */
export function escolherPar(topics: Topic[], data: LocalDate): { a: Topic; b: Topic } | null {
  const estudados = topics
    .filter((t) => t.lastStudiedAt || t.review.reps > 0)
    .sort((x, y) => (y.lastStudiedAt ?? '').localeCompare(x.lastStudiedAt ?? ''));
  const s = semente(data);
  const candidatosA = estudados.slice(0, 5).filter((a) => estudados.some((b) => b.subjectId !== a.subjectId));
  if (candidatosA.length === 0) return null;
  const a = candidatosA[s % candidatosA.length];
  const outros = estudados.filter((t) => t.subjectId !== a.subjectId);
  return { a, b: outros[Math.floor(s / 7) % outros.length] };
}
