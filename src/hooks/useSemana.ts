import { useCallback } from 'react';
import { addDays, weekStartOf, weekdayIndex } from '../domain/dates';
import { mesmoNome } from '../domain/importacao';
import { proximoTopico } from '../domain/materias';
import { herdadasDeOntem, type FontesSemana, type Linha } from '../domain/semana';
import type { Energy, LocalDate } from '../domain/types';
import { useEntregas } from '../store/entregas';
import { useFaculdade } from '../store/faculdade';
import { useStudy } from '../store/study';

/** Monta as fontes de qualquer dia (aulas, prazos, plano, revisões) a partir das stores. */
export function useFontesSemana() {
  const blocos = useFaculdade((s) => s.blocos);
  const eventos = useFaculdade((s) => s.eventos);
  const entregas = useEntregas((s) => s.lista);
  const topics = useStudy((s) => s.topics);
  const subjects = useStudy((s) => s.subjects);
  const plans = useStudy((s) => s.plans);
  const checkins = useStudy((s) => s.checkins);

  const fontesDoDia = useCallback(
    (dia: LocalDate): FontesSemana => ({
      blocos,
      entregas,
      eventos,
      topics,
      subjects,
      planejados: plans[weekStartOf(dia)]?.days[weekdayIndex(dia)] ?? [],
      proximoDe: (nome) => {
        const materia = subjects.find((s) => mesmoNome(s.name, nome));
        return materia ? proximoTopico(topics.filter((t) => t.subjectId === materia.id)) : undefined;
      },
    }),
    [blocos, entregas, eventos, topics, subjects, plans],
  );

  /** O que sobrou do dia anterior (se ele foi cansado) e agora é prioridade. */
  const herdadasPara = useCallback(
    (dia: LocalDate): Linha[] => {
      const ontem = addDays(dia, -1);
      const energia: Energy | undefined = checkins[ontem]?.energy;
      return herdadasDeOntem(dia, energia, fontesDoDia(ontem));
    },
    [checkins, fontesDoDia],
  );

  return { fontesDoDia, herdadasPara, checkins };
}
