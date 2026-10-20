import { addDays, toLocalDate, weekStartOf } from '../domain/dates';
import { SUBJECT_COLORS } from '../domain/catalog';
import type { MapaMateria } from '../domain/mapa';
import { suggestWeek } from '../domain/planner';
import type { PlanItem } from '../domain/types';
import { newId, useStudy } from './study';
import { useBoards } from '../features/lousa/boardsStore';

/**
 * Transforma o mapa aprovado em coisa de verdade no app:
 *  - matéria nova + tópicos com pré-requisitos (galho na Árvore);
 *  - o 1º tópico vira o Target;
 *  - a semana (de hoje até domingo) ganha os blocos sugeridos, sem apagar o que já tinha;
 *  - nasce uma lousa "Mapa de <matéria>" com o caminho desenhado.
 * Devolve os ids pra quem chamou (ex.: criar a lousa do mapa).
 */
export function aplicarMapa(mapa: MapaMateria): { subjectId: string; topicIds: string[] } {
  const estudo = useStudy.getState();
  const cor = SUBJECT_COLORS[estudo.subjects.length % SUBJECT_COLORS.length];
  const subjectId = estudo.addSubject({ name: mapa.materia, color: cor, language: mapa.linguagem });

  const topicIds: string[] = [];
  mapa.topicos.forEach((t, i) => {
    const parentId = t.pai !== undefined ? topicIds[t.pai] : undefined;
    topicIds[i] = useStudy.getState().addTopic({ subjectId, title: t.titulo, parentId });
    if (t.porque) useStudy.getState().updateTopic(topicIds[i], { notes: `> Por que estudar: ${t.porque}\n` });
  });

  const primeiro = useStudy.getState().topics.find((t) => t.id === topicIds[0]);
  useStudy.getState().setTarget({ topicId: topicIds[0], goal: mapa.objetivo ?? '', priority: 'NORMAL' });

  // Semana: junta a sugestão (a partir de hoje) com o que já estava planejado.
  const hoje = toLocalDate();
  const inicio = weekStartOf(hoje);
  const datas = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const sugestao = suggestWeek(datas, useStudy.getState().topics, primeiro, hoje, () => newId('pl'));
  const atual = useStudy.getState().plans[inicio]?.days ?? datas.map((): PlanItem[] => []);
  const repetido = (dia: PlanItem[], item: PlanItem) => dia.some((x) => x.topicId === item.topicId && x.kind === item.kind);
  useStudy.getState().setWeekPlan({
    weekStart: inicio,
    days: atual.map((dia, i) => [...dia, ...sugestao[i].filter((item) => !repetido(dia, item))]),
  });

  // Lousa com o caminho desenhado (o desenho é feito quando ela for aberta).
  useBoards.getState().create(`Mapa de ${mapa.materia}`, { topicId: topicIds[0], mapa });

  return { subjectId, topicIds };
}
