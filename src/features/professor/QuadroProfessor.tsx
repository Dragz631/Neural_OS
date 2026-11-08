import { useEffect, useMemo } from 'react';
import type { Lesson, Topic } from '../../domain/types';
import { useRascunhos } from '../../store/rascunhos';
import { useBoards } from '../lousa/boardsStore';
import { Board, type DesenhoNovo } from '../lousa/LousaPage';
import { aulaParaElementos, cenaParaElementos } from './aulaParaQuadro';

/**
 * Quadro do Prof. A.Ilson = o mesmo Excalidraw da Lousa, um por tópico.
 * Ele desenha a aula; você anota em volta, cola vídeo do YouTube (Incorporar),
 * usa a biblioteca. Aula nova é desenhada ao lado, sem apagar nada; o desenho
 * que o chat sugeriu ("Pôr no quadro") também. O quadro é do professor: fica só
 * aqui, não na lista da Lousa.
 */
export function QuadroProfessor({ topic, lesson }: { topic: Topic; lesson?: Lesson }) {
  const quadro = useBoards((s) => s.boards.find((b) => b.quadroDe === topic.id));
  const doChat = useRascunhos((s) => s.paraQuadro[topic.id]);

  useEffect(() => {
    if (!quadro) useBoards.getState().quadroDoTopico(topic.id, topic.title);
  }, [quadro, topic.id, topic.title]);

  // O mais recente entre a aula e o desenho do chat é o que entra (cada um uma vez só).
  const desenho = useMemo<DesenhoNovo | undefined>(() => {
    const daAula: DesenhoNovo | undefined = lesson ? { chave: `aula:${lesson.generatedAt}`, criar: () => aulaParaElementos(topic.title, lesson) } : undefined;
    if (!doChat) return daAula;
    const quandoChat = Number(doChat.chave.split(':')[1]) || 0;
    if (daAula && lesson && new Date(lesson.generatedAt).getTime() > quandoChat) return daAula;
    return { chave: doChat.chave, criar: () => cenaParaElementos(doChat.titulo, doChat.cena) };
  }, [lesson, topic.title, doChat]);

  if (!quadro) return null;
  return (
    <div className="h-[72vh] min-h-[480px] overflow-hidden rounded border border-line">
      <Board key={quadro.id} boardId={quadro.id} name={quadro.name} topicId={topic.id} desenho={desenho} />
    </div>
  );
}
