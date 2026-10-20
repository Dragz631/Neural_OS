import type { StudySession, Subject, Topic } from './types';
import { levelFromXp, xpForSession } from './xp';

// Resumo de cada matéria pro Lobby: quanto já domina, nível e qual é o próximo tópico.

export const DOMINADO = 80;
/** Abaixo disso o pré-requisito é "fraco": o tópico seguinte aparece com cadeado. */
export const PRE_REQUISITO_OK = 60;

export interface ResumoMateria {
  subject: Subject;
  total: number;
  dominados: number;
  nivel: number;
  proximo?: Topic;
}

/** Próximo tópico: o primeiro (na ordem de criação) ainda não dominado cujo pré-requisito está ok. */
export function proximoTopico(topics: Topic[]): Topic | undefined {
  const porId = new Map(topics.map((t) => [t.id, t]));
  const liberado = (t: Topic) => !t.parentId || (porId.get(t.parentId)?.mastery ?? 100) >= PRE_REQUISITO_OK;
  const abertos = topics.filter((t) => t.mastery < DOMINADO);
  return abertos.find(liberado) ?? abertos[0];
}

export function resumirMaterias(subjects: Subject[], topics: Topic[], sessions: StudySession[]): ResumoMateria[] {
  return subjects.map((subject) => {
    const doTema = topics.filter((t) => t.subjectId === subject.id);
    const ids = new Set(doTema.map((t) => t.id));
    const xp = sessions.filter((s) => ids.has(s.topicId)).reduce((soma, s) => soma + xpForSession(s.minutes, s.score), 0);
    return {
      subject,
      total: doTema.length,
      dominados: doTema.filter((t) => t.mastery >= DOMINADO).length,
      nivel: levelFromXp(xp).level,
      proximo: proximoTopico(doTema),
    };
  });
}
