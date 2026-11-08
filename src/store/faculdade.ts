import { create } from 'zustand';
import { persist } from '../lib/persistir';
import type { BlocoGrade } from '../domain/grade';
import type { Id, LocalDate } from '../domain/types';

// A faculdade dentro do app: grade (aulas fixas e rotina), eventos do calendário
// (cronograma tirado dos slides e do Notion) e qual caderno do NotebookLM é de
// qual matéria. Prazos com entrega ficam em store/entregas.ts.

export type TipoEvento = 'prova' | 'trabalho' | 'apresentacao' | 'palestra' | 'aula' | 'outro';

export interface EventoFaculdade {
  id: Id;
  titulo: string;
  data: LocalDate;
  tipo: TipoEvento;
  materia?: string;
  /** De onde veio ("slides de Paradigmas", "Notion"), pra ele poder conferir. */
  origem: string;
}

interface FaculdadeState {
  montadaEm?: string;
  blocos: BlocoGrade[];
  eventos: EventoFaculdade[];
  /** subjectId → id do caderno do NotebookLM. */
  cadernoDe: Record<Id, string>;
  salvarGrade: (blocos: BlocoGrade[]) => void;
  somarEventos: (eventos: EventoFaculdade[]) => void;
  removerEvento: (id: Id) => void;
  ligarCaderno: (subjectId: Id, cadernoId: string) => void;
  marcarMontada: () => void;
}

export const useFaculdade = create<FaculdadeState>()(
  persist(
    (set) => ({
      blocos: [],
      eventos: [],
      cadernoDe: {},
      salvarGrade: (blocos) => set({ blocos }),
      somarEventos: (novos) =>
        set((s) => {
          const repetido = (e: EventoFaculdade) => s.eventos.some((x) => x.data === e.data && x.titulo === e.titulo);
          return { eventos: [...s.eventos, ...novos.filter((e) => !repetido(e))] };
        }),
      removerEvento: (id) => set((s) => ({ eventos: s.eventos.filter((e) => e.id !== id) })),
      ligarCaderno: (subjectId, cadernoId) => set((s) => ({ cadernoDe: { ...s.cadernoDe, [subjectId]: cadernoId } })),
      marcarMontada: () => set({ montadaEm: new Date().toISOString() }),
    }),
    { name: 'neural-os.faculdade', version: 1 },
  ),
);
