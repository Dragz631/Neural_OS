import { useBoards } from '../features/lousa/boardsStore';
import { useNav } from './nav';
import { useRascunhos } from './rascunhos';
import { useRoadmaps } from './roadmaps';
import { useStudy } from './study';

/** O que vai embora junto com a matéria (pra mostrar na confirmação). */
export function resumoDaMateria(subjectId: string): { topicos: number; lousas: number; temRoadmap: boolean } {
  const ids = new Set(useStudy.getState().topics.filter((t) => t.subjectId === subjectId).map((t) => t.id));
  const lousas = useBoards.getState().boards.filter((b) => (b.topicId && ids.has(b.topicId)) || b.roadmapDe === subjectId).length;
  return { topicos: ids.size, lousas, temRoadmap: !!useRoadmaps.getState().porMateria[subjectId] };
}

/**
 * Apaga a matéria de verdade: tópicos, as lousas deles (quadro do professor, quadro livre,
 * mapa, roadmap), rascunhos e o roadmap. Só `removeSubject` deixaria lousas órfãs pra trás.
 */
export function apagarMateria(subjectId: string): void {
  const estudo = useStudy.getState();
  const ids = new Set(estudo.topics.filter((t) => t.subjectId === subjectId).map((t) => t.id));

  const lousas = useBoards.getState();
  lousas.boards.filter((b) => (b.topicId && ids.has(b.topicId)) || b.roadmapDe === subjectId).forEach((b) => lousas.remove(b.id));

  useRoadmaps.getState().apagar(subjectId);

  const rasc = useRascunhos.getState();
  ids.forEach((id) => {
    rasc.escreverFeynman(id, '');
    rasc.guardarRevisao(id, undefined);
  });
  if (rasc.ultimoTopico && ids.has(rasc.ultimoTopico)) useRascunhos.setState({ ultimoTopico: undefined });
  const nav = useNav.getState();
  if (nav.topicId && ids.has(nav.topicId)) useNav.setState({ topicId: undefined });

  estudo.removeSubject(subjectId);
}
