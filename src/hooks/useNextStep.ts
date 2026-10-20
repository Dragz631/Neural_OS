import { nextStep, type NextStep } from '../domain/nextStep';
import { useStudy } from '../store/study';
import { useToday } from './useToday';

/** O próximo passo de agora (o mesmo cálculo pra barra e pro Lobby). */
export function useNextStep(): { step: NextStep; tired: boolean } {
  const { missions, due, targetTopic, checkin } = useToday();
  const hasTopics = useStudy((s) => s.topics.length > 0);
  const tired = checkin?.energy === 1;
  return { step: nextStep({ missions, due, target: targetTopic, hasTopics, tired }), tired };
}

