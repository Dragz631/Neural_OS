import type { StudySession, Subject, Topic } from './types';
import { levelFromXp, somaXpSessoes } from './xp';

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
    const xp = somaXpSessoes(sessions.filter((s) => ids.has(s.topicId)));
    return {
      subject,
      total: doTema.length,
      dominados: doTema.filter((t) => t.mastery >= DOMINADO).length,
      nivel: levelFromXp(xp).level,
      proximo: proximoTopico(doTema),
    };
  });
}

/** Cadeado da Árvore: pré-requisito ainda fraco. Dá pra estudar mesmo assim (é só aviso). */
export function preRequisitoFraco(topic: Topic, topics: Topic[]): Topic | undefined {
  if (!topic.parentId || topic.mastery >= DOMINADO) return undefined;
  const pai = topics.find((t) => t.id === topic.parentId);
  return pai && pai.mastery < PRE_REQUISITO_OK ? pai : undefined;
}
