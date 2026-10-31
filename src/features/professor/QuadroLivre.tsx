import { useEffect } from 'react';
import type { Topic } from '../../domain/types';
import { useBoards } from '../lousa/boardsStore';
import { Board } from '../lousa/LousaPage';

/** Quadro em branco só do aluno: o professor não desenha aqui. Aparece também na aba Lousa. */
export function QuadroLivre({ topic }: { topic: Topic }) {
  const quadro = useBoards((s) => s.boards.find((b) => b.livreDe === topic.id));

  useEffect(() => {
    if (!quadro) useBoards.getState().quadroLivreDoTopico(topic.id, topic.title);
  }, [quadro, topic.id, topic.title]);

  if (!quadro) return null;
  return (
    <div className="h-[72vh] min-h-[480px] overflow-hidden rounded border border-line">
      <Board key={quadro.id} boardId={quadro.id} name={quadro.name} topicId={topic.id} />
    </div>
  );
}
