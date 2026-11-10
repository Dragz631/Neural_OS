import { useEffect } from 'react';
import { acharTopico } from '../domain/roadmap';
import { gerarRoadmap } from '../services/ai/roadmap';
import { slidesDaMateria } from './notebookVivo';
import { iaLigada, useConexoes, useIALigada } from '../store/conexoes';
import { useRoadmaps } from '../store/roadmaps';
import { useStudy } from '../store/study';
import { rodarTarefa, useTarefas } from '../store/tarefas';

// "Diga o que quer aprender e o professor sabe o que fazer" (Hugo, 10/11/2026): a matéria
// nova ou a do Target sem trilha ganha o roadmap sozinha, e os primeiros tópicos já nascem
// na Árvore. Antes, só quem começava com o app vazio ganhava isso; criar matéria pelo
// "Novo tópico" deixava ela vazia (o caso da Geografia).

const tentadas = new Set<string>();

/** Monta o roadmap da matéria e cria os tópicos da 1ª etapa. Roda como tarefa (trocar de aba não cancela). */
export function montarTrilha(subjectId: string) {
  const subject = useStudy.getState().subjects.find((s) => s.id === subjectId);
  if (!subject) return;
  tentadas.add(subjectId);
  void rodarTarefa(`roadmap:${subjectId}`, { rotulo: `Professor montando a trilha de ${subject.name}`, aba: 'professor', avisarPronto: `Trilha de ${subject.name} pronta` }, async (signal) => {
    const topicos = () => useStudy.getState().topics.filter((t) => t.subjectId === subjectId);
    const roadmap = await gerarRoadmap({ materia: subject.name, topicosAtuais: topicos().map((t) => t.title), slides: slidesDaMateria(subjectId) }, signal);
    useRoadmaps.getState().salvar(subjectId, roadmap);
    // A 1ª etapa vira tópicos de verdade: já dá pra pedir a aula do primeiro.
    let primeiro: string | undefined;
    for (const item of roadmap.etapas[0]?.itens ?? []) {
      const id = acharTopico(topicos(), item.titulo)?.id ?? useStudy.getState().addTopic({ subjectId, title: item.titulo });
      primeiro ??= id;
    }
    // O Target nesta matéria sem aula nenhuma ainda? Aponta pro começo da trilha.
    const st = useStudy.getState();
    const alvo = st.topics.find((t) => t.id === st.target.topicId);
    if (primeiro && alvo?.subjectId === subjectId && !alvo.lesson && topicos().every((t) => !t.lesson)) st.setTarget({ ...st.target, topicId: primeiro });
  });
}

/** Precisa de trilha: tem IA, não tem roadmap, não está montando e ainda não tentou nesta abertura do app. */
export function precisaDeTrilha(subjectId: string | undefined): boolean {
  if (!subjectId || tentadas.has(subjectId)) return false;
  if (!iaLigada(useConexoes.getState().motores)) return false;
  if (useRoadmaps.getState().porMateria[subjectId]) return false;
  return !useTarefas.getState().lista[`roadmap:${subjectId}`];
}

/** No Lobby: a matéria do Target sem trilha ganha a trilha sozinha (uma vez). */
export function useTrilhaDoTarget() {
  const subjectId = useStudy((s) => s.topics.find((t) => t.id === s.target.topicId)?.subjectId);
  const temRoadmap = useRoadmaps((s) => !!(subjectId && s.porMateria[subjectId]));
  const aiOn = useIALigada();
  useEffect(() => {
    if (aiOn && subjectId && !temRoadmap && precisaDeTrilha(subjectId)) montarTrilha(subjectId);
  }, [aiOn, subjectId, temRoadmap]);
}
