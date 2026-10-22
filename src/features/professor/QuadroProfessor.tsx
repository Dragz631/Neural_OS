import { useEffect, useMemo } from 'react';
import type { Lesson, Topic } from '../../domain/types';
import { useBoards } from '../lousa/boardsStore';
import { Board, type DesenhoNovo } from '../lousa/LousaPage';
import { aulaParaElementos } from './aulaParaQuadro';

/**
 * Quadro do Prof. A.Ilson = o mesmo Excalidraw da Lousa, um por tópico.
 * Ele desenha a aula; você anota em volta, cola vídeo do YouTube (Incorporar),
 * usa a biblioteca. Aula nova é desenhada ao lado, sem apagar nada.
 * O quadro também aparece na lista da aba Lousa ("Quadro: <tópico>").
 */
export function QuadroProfessor({ topic, lesson }: { topic: Topic; lesson?: Lesson }) {
  const quadro = useBoards((s) => s.boards.find((b) => b.quadroDe === topic.id));

  useEffect(() => {
    if (!quadro) useBoards.getState().quadroDoTopico(topic.id, topic.title);
  }, [quadro, topic.id, topic.title]);

  const desenho = useMemo<DesenhoNovo | undefined>(
    () => (lesson ? { chave: `aula:${lesson.generatedAt}`, criar: () => aulaParaElementos(topic.title, lesson) } : undefined),
    [lesson, topic.title],
  );

  if (!quadro) return null;
  return (
    <div className="h-[72vh] min-h-[480px] overflow-hidden rounded border border-line">
      <Board key={quadro.id} boardId={quadro.id} name={quadro.name} topicId={topic.id} desenho={desenho} />
    </div>
  );
}
