import type { AdaptedItem } from './planner';
import type { SessionKind, Topic } from './types';

// ─── Próximo passo ───────────────────────────────────────────────────────────
// O motivo do Neural-OS existir: você nunca fica sem saber o que fazer agora.
// Esta função escolhe UMA ação, sempre na mesma ordem, pra não ter decisão a tomar:
//   1. missão de hoje ainda não feita (o plano do dia já vem ajustado pela energia
//      e já começa pelas revisões vencidas)
//   2. revisão vencida (quando não há plano)
//   3. o Target
//   4. nada cadastrado → criar o primeiro tópico

export interface NextStep {
  title: string;
  why: string;
  minutes?: number;
  kind?: SessionKind;
  topicId?: string;
  action: 'professor' | 'sandbox' | 'lobby';
}

const TAB_BY_KIND: Record<SessionKind, NextStep['action']> = {
  aula: 'professor',
  leitura: 'professor',
  explicacao: 'professor',
  revisao: 'professor',
  desafio: 'sandbox',
};

export function nextStep(input: {
  missions: AdaptedItem[];
  due: Topic[];
  target?: Topic;
  hasTopics: boolean;
  tired: boolean;
}): NextStep {
  const { missions, due, target, hasTopics, tired } = input;

  const mission = missions.find((m) => !m.done);
  if (mission) {
    return {
      title: mission.title,
      why: mission.fromReview ? 'Está na hora de revisar, antes de esquecer.' : 'É o próximo item do seu plano de hoje.',
      minutes: mission.minutes,
      kind: mission.kind,
      topicId: mission.topicId,
      action: TAB_BY_KIND[mission.kind],
    };
  }

  if (due.length > 0) {
    const t = due[0];
    return {
      title: `Revisar: ${t.title}`,
      why: 'Revisão vencida. Explique sem olhar as anotações.',
      minutes: tired ? 5 : 10,
      kind: 'revisao',
      topicId: t.id,
      action: 'professor',
    };
  }

  if (target) {
    return {
      title: tired ? `Mini-leitura: ${target.title}` : `Estudar: ${target.title}`,
      why: tired ? 'Dia pesado: só 10 minutos pra não perder o fio.' : 'É o seu Target atual.',
      minutes: tired ? 10 : 30,
      kind: tired ? 'leitura' : 'aula',
      topicId: target.id,
      action: 'professor',
    };
  }

  return {
    title: hasTopics ? 'Escolher o Target' : 'Criar a primeira matéria e tópico',
    why: hasTopics ? 'Defina o que você está aprendendo agora.' : 'Tudo no app nasce do que você está estudando.',
    action: 'lobby',
  };
}
