import type { DayCheckin, PlanItem, SessionKind, Topic } from './types';

// ─── Adaptar o dia à sua energia e tempo ─────────────────────────────────────
// Você planeja a semana no domingo. No dia, diz quanta energia e quanto tempo tem,
// e o plano se ajusta. Regra de ouro: NUNCA zera — no pior dia sobra uma mini-leitura
// e um micro-desafio.

export interface AdaptedItem extends PlanItem {
  /** Veio de uma revisão vencida (não estava no plano). */
  fromReview?: boolean;
  /** Foi encurtado pra caber no tempo. */
  shortened?: boolean;
}

const HEAVY: SessionKind[] = ['aula', 'explicacao', 'desafio'];
const MIN_BLOCK = 10;
const MAX_REVIEWS = 3;

export function adaptDay(
  planned: PlanItem[],
  checkin: DayCheckin,
  dueTopics: Topic[],
  fallbackTopic?: Topic,
): AdaptedItem[] {
  const pending = planned.filter((i) => !i.done);
  const plannedTopicIds = new Set(pending.map((i) => i.topicId));

  // 1) Revisões vencidas entram primeiro: são curtas e evitam esquecer.
  const reviews: AdaptedItem[] = dueTopics
    .filter((t) => !plannedTopicIds.has(t.id))
    .slice(0, MAX_REVIEWS)
    .map((t) => ({
      id: `rev_${t.id}`,
      topicId: t.id,
      title: `Revisar: ${t.title}`,
      kind: 'revisao' as const,
      minutes: 10,
      done: false,
      fromReview: true,
    }));

  // 2) Energia baixa: troca o que é pesado por leitura e limita cada bloco.
  const lowEnergy = checkin.energy === 1;
  const adjusted: AdaptedItem[] = pending.map((i) =>
    lowEnergy && HEAVY.includes(i.kind)
      ? { ...i, kind: 'leitura', minutes: Math.min(i.minutes, 10), shortened: true }
      : { ...i },
  );

  // 3) Encaixa no tempo disponível, encurtando o último bloco se preciso.
  let budget = checkin.minutesAvailable;
  const result: AdaptedItem[] = [];
  for (const item of [...reviews, ...adjusted]) {
    if (budget < MIN_BLOCK) break;
    if (item.minutes <= budget) {
      result.push(item);
      budget -= item.minutes;
    } else {
      result.push({ ...item, minutes: budget, shortened: true });
      budget = 0;
    }
  }

  // 4) Nunca zera: garante o mínimo de aprendizado.
  if (result.length === 0) {
    const topic = fallbackTopic ?? dueTopics[0];
    const title = topic?.title ?? 'o tópico atual';
    const minutes = Math.max(5, Math.min(checkin.minutesAvailable, 15));
    result.push(
      { id: 'mini_leitura', topicId: topic?.id, title: `Mini-leitura: ${title}`, kind: 'leitura', minutes: Math.ceil(minutes * 0.6), done: false, shortened: true },
      { id: 'mini_desafio', topicId: topic?.id, title: `Micro-desafio: ${title}`, kind: 'desafio', minutes: Math.floor(minutes * 0.4) || 3, done: false, shortened: true },
    );
  }

  return result;
}

export function totalMinutes(items: PlanItem[]): number {
  return items.reduce((sum, i) => sum + i.minutes, 0);
}

// ─── Sugestão de semana (ponto de partida pro planejamento de domingo) ───────
// Revisões caem no dia em que vencem; o tópico-alvo alterna aula → desafio →
// explicação, com sábado leve e domingo só pra revisar e planejar.

const TARGET_ROTATION: { kind: SessionKind; minutes: number }[] = [
  { kind: 'aula', minutes: 40 },
  { kind: 'desafio', minutes: 25 },
  { kind: 'aula', minutes: 40 },
  { kind: 'explicacao', minutes: 15 },
  { kind: 'desafio', minutes: 25 },
  { kind: 'leitura', minutes: 15 },
];

export function suggestWeek(
  weekDates: string[],
  topics: Topic[],
  target: Topic | undefined,
  today: string,
  makeId: () => string = () => Math.random().toString(36).slice(2),
): PlanItem[][] {
  return weekDates.map((date, i) => {
    if (date < today) return []; // não planeja o passado
    const items: PlanItem[] = topics
      .filter((t) => t.lastStudiedAt && t.review.due === date)
      .slice(0, 3)
      .map((t) => ({ id: makeId(), topicId: t.id, title: `Revisar: ${t.title}`, kind: 'revisao', minutes: 10, done: false }));

    if (target && i < 6) {
      const step = TARGET_ROTATION[i];
      items.push({ id: makeId(), topicId: target.id, title: target.title, kind: step.kind, minutes: step.minutes, done: false });
    }
    return items;
  });
}
