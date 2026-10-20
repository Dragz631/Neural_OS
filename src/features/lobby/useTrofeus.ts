import { useEffect, useMemo } from 'react';
import { useDiasEstudados } from '../../hooks/useDiasEstudados';
import { avaliarTrofeus } from '../../domain/trofeus';
import { useDungeon } from '../dungeon/store';
import { useBoards } from '../lousa/boardsStore';
import { useEntregas } from '../../store/entregas';
import { selectDueTopics, streakDays, useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { useTrofeusPagos } from '../../store/trofeus';

/** Troféus calculados agora + paga o XP dos recém-destravados (uma vez só). */
export function useTrofeus() {
  const sessions = useStudy((s) => s.sessions);
  const topics = useStudy((s) => s.topics);
  const challenges = useStudy((s) => s.challenges);
  const entregas = useEntregas((s) => s.lista);
  const boards = useBoards((s) => s.boards);
  const progresso = useDungeon((s) => s.progress);
  const pagos = useTrofeusPagos((s) => s.pagos);
  const diasEstudados = useDiasEstudados();

  const lista = useMemo(() => {
    const trilhas = Object.values(progresso);
    return avaliarTrofeus({
      sessions,
      topics,
      challenges,
      sequencia: streakDays(diasEstudados),
      entregues: entregas.filter((e) => e.status === 'entregue').length,
      maiorLousa: boards.reduce((m, b) => Math.max(m, b.elementCount), 0),
      fasesDungeon: trilhas.reduce((s, t) => s + t.completedStageIds.length, 0),
      chefesDungeon: trilhas.reduce((s, t) => s + t.defeatedBossIds.length, 0),
      revisoesVencidas: selectDueTopics(topics).length,
    });
  }, [sessions, topics, challenges, entregas, boards, progresso, diasEstudados]);

  useEffect(() => {
    // Lê a lista atual (não a da renderização): se este hook roda em dois lugares, só um paga.
    const jaPagos = useTrofeusPagos.getState().pagos;
    const novos = lista.filter((t) => t.destravado && !jaPagos.includes(t.id));
    if (novos.length === 0) return;
    useTrofeusPagos.getState().pagar(novos.map((t) => t.id));
    useStudy.getState().addXp(novos.reduce((s, t) => s + t.xp, 0));
    for (const t of novos) toast({ title: `Troféu: ${t.nome}`, description: `+${t.xp} XP`, variant: 'success' });
  }, [lista, pagos]);

  return lista;
}
