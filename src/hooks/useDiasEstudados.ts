import { useMemo } from 'react';
import type { LocalDate } from '../domain/types';
import { usePresenca } from '../store/presenca';
import { minutesByDate, useStudy } from '../store/study';

/**
 * Minutos por dia, contando também os dias marcados à mão no calendário
 * (presença sem sessão conta como 1 min, só pra entrar na sequência).
 */
export function useDiasEstudados(): Record<LocalDate, number> {
  const sessions = useStudy((s) => s.sessions);
  const manual = usePresenca((s) => s.dias);
  return useMemo(() => {
    const dias = minutesByDate(sessions);
    for (const d of manual) dias[d] = Math.max(dias[d] ?? 0, 1);
    return dias;
  }, [sessions, manual]);
}
