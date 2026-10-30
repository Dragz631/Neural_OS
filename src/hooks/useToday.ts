import { useMemo } from 'react';
import { prazosProximos } from '../domain/calendario';
import { toLocalDate, weekStartOf, weekdayIndex } from '../domain/dates';
import { aulasDoDia } from '../domain/grade';
import { mesmoNome } from '../domain/importacao';
import { proximoTopico } from '../domain/materias';
import { adaptDay, type AdaptedItem } from '../domain/planner';
import type { SessionKind } from '../domain/types';
import { useEntregas } from '../store/entregas';
import { useFaculdade } from '../store/faculdade';
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
  const subjects = useStudy((s) => s.subjects);
  const blocos = useFaculdade((s) => s.blocos);
  const entregas = useEntregas((s) => s.lista);

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

    // Faculdade: teve aula hoje → revisar enquanto está fresco; prazo perto → trabalhar nele.
    // Cansado, a revisão encolhe e o trabalho fica pra outro dia (energia baixa manda).
    const cansado = checkin?.energy === 1;
    const daAula: AdaptedItem[] = aulasDoDia(blocos, new Date().getDay()).map((a) => {
      const subject = subjects.find((s) => mesmoNome(s.name, a.materia ?? ''));
      const proximo = subject && proximoTopico(topics.filter((t) => t.subjectId === subject.id));
      return { id: `aula_${a.dia}_${a.inicio}`, topicId: proximo?.id, title: `Revisar a aula de hoje: ${a.materia}`, kind: 'revisao', minutes: cansado ? 5 : 15, done: false, fromReview: true, shortened: cansado };
    });
    const dePrazo: AdaptedItem[] = cansado
      ? []
      : prazosProximos(entregas, today, 7)
          .slice(0, 2)
          .map((e) => ({ id: `prazo_${e.id}`, title: `${e.titulo} (${e.faltam === 0 ? 'é hoje' : `faltam ${e.faltam} dia(s)`})`, kind: 'leitura', minutes: 25, done: false, fromReview: true }));

    return { today, weekStart, dayIdx, planned, checkin, due, missions: [...daAula, ...dePrazo, ...missions], targetTopic };
  }, [topics, plans, checkins, target.topicId, subjects, blocos, entregas]);
}
