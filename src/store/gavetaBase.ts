import { create } from 'zustand';
import type { Id } from '../domain/types';
import { gerarBase } from '../services/ai/base';
import { useBases } from './bases';
import { useStudy } from './study';
import { rodarTarefa } from './tarefas';

// A gaveta do "Travei numa base" (só deste aparelho, não é salva): aberta?, qual base, de qual aula.

interface GavetaState {
  aberta: boolean;
  baseId?: string;
  /** Aula de onde ele veio (pros números da aula e pro diário). */
  topicId?: Id;
  /** Dúvida já escrita (ex.: o trecho do quadro que ele selecionou). */
  duvida?: string;
  abrir: (p?: { topicId?: Id; duvida?: string; baseId?: string }) => void;
  fechar: () => void;
  mostrar: (baseId: string | undefined) => void;
}

export const useGavetaBase = create<GavetaState>()((set) => ({
  aberta: false,
  abrir: (p) => set({ aberta: true, topicId: p?.topicId, duvida: p?.duvida, baseId: p?.baseId }),
  fechar: () => set({ aberta: false }),
  mostrar: (baseId) => set({ baseId }),
}));

export const CHAVE_BASE = 'base:explicar';

/** Pede a explicação desenhada (roda como tarefa: fechar a gaveta ou trocar de aba não cancela). */
export function explicarBase(duvida: string, topicId?: Id) {
  const st = useStudy.getState();
  const topic = topicId ? st.topics.find((t) => t.id === topicId) : undefined;
  const materia = topic ? st.subjects.find((s) => s.id === topic.subjectId)?.name : undefined;
  void rodarTarefa(CHAVE_BASE, { rotulo: `Professor desenhando a base: ${duvida.slice(0, 40)}`, aba: 'professor', avisarPronto: 'Explicação da base pronta' }, async (signal) => {
    const explicacao = await gerarBase({ duvida, materia, topico: topic?.title, trechoAula: topic?.lesson?.explanation.slice(0, 1500) }, signal);
    const id = useBases.getState().guardar({ duvida, explicacao, deTopico: topic?.title });
    if (topic) useStudy.getState().addDiario(topic.id, { tipo: 'duvida', original: `Travei numa base: ${duvida} (o professor explicou "${explicacao.titulo}" desenhando)` });
    useGavetaBase.getState().mostrar(id);
  });
}

/** Errou a pergunta: o professor explica de OUTRO jeito, pensando no erro. */
export function explicarDeOutroJeito(baseId: string, respondeu: string) {
  const b = useBases.getState().bases.find((x) => x.id === baseId);
  if (!b) return;
  void rodarTarefa(CHAVE_BASE, { rotulo: `Professor explicando ${b.explicacao.titulo} de outro jeito`, aba: 'professor' }, async (signal) => {
    const explicacao = await gerarBase({ duvida: b.duvida, topico: b.deTopico, errou: { explicacao: b.explicacao, respondeu } }, signal);
    useBases.getState().trocarExplicacao(baseId, explicacao);
  });
}
