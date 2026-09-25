import { useMemo } from 'react';
import { toLocalDate, weekStartOf, weekdayIndex } from '../domain/dates';
import { adaptDay, type AdaptedItem } from '../domain/planner';
import type { SessionKind } from '../domain/types';
import type { TabId } from '../store/nav';
import { selectDueTopics, useStudy } from '../store/study';

export const KIND_META: Record<SessionKind, { label: string; tab: TabId }> = {
  aula: { label: 'Aula', tab: 'professor' },
  leitura: { label: 'Leitura', tab: 'professor' },
  explicacao: { label: 'Explicar (Feynman)', tab: 'professor' },
  revisao: { label: 'Revisão', tab: 'professor' },
  desafio: { label: 'Desafio', tab: 'sandbox' },
};

/**
 * O "hoje" do app: plano da semana + check-in de energia + revisões vencidas.
 * Lobby (missões) e Molda-Horário leem daqui, então os dois sempre concordam.
 */
export function useToday() {
  const topics = useStudy((s) => s.topics);
  const plans = useStudy((s) => s.plans);
  const checkins = useStudy((s) => s.checkins);
  const target = useStudy((s) => s.target);

  return useMemo(() => {
    const today = toLocalDate();
    const weekStart = weekStartOf(today);
    const dayIdx = weekdayIndex(today);
    const planned = plans[weekStart]?.days[dayIdx] ?? [];
    const checkin = checkins[today];
    const due = selectDueTopics(topics, today);
    const targetTopic = topics.find((t) => t.id === target.topicId);

    // Sem check-in: mostra o plano como está + revisões vencidas.
    const missions: AdaptedItem[] = checkin
      ? adaptDay(planned, checkin, due, targetTopic)
      : [
          ...due.slice(0, 3).map((t) => ({ id: `rev_${t.id}`, topicId: t.id, title: `Revisar: ${t.title}`, kind: 'revisao' as const, minutes: 10, done: false, fromReview: true })),
          ...planned,
        ];

    return { today, weekStart, dayIdx, planned, checkin, due, missions, targetTopic };
  }, [topics, plans, checkins, target.topicId]);
}
