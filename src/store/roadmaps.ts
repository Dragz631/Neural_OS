import { create } from 'zustand';
import { persist } from '../lib/persistir';
import type { Roadmap } from '../domain/roadmap';
import { useBoards } from '../features/lousa/boardsStore';

// Um roadmap por matéria, e uma lousa só pra ele ("Roadmap: <matéria>"). Refazer
// troca a lousa antiga pela nova: o roadmap nunca vira uma pilha de notas.

interface RoadmapsState {
  porMateria: Record<string, Roadmap & { criadoEm: string }>;
  /** Guarda o roadmap e (re)cria a lousa dele. Devolve o id da lousa. */
  salvar: (subjectId: string, roadmap: Roadmap) => string;
  apagar: (subjectId: string) => void;
}

export const useRoadmaps = create<RoadmapsState>()(
  persist(
    (set) => ({
      porMateria: {},
      salvar: (subjectId, roadmap) => {
        const boards = useBoards.getState();
        boards.boards.filter((b) => b.roadmapDe === subjectId).forEach((b) => boards.remove(b.id));
        // A lousa do roadmap é do professor (fica na aba Professor): não pode roubar a lousa que a pessoa tinha aberta.
        const abertaAntes = useBoards.getState().activeId;
        const id = useBoards.getState().create(`Roadmap: ${roadmap.materia}`, { roadmap, roadmapDe: subjectId });
        useBoards.setState({ activeId: abertaAntes });
        set((s) => ({ porMateria: { ...s.porMateria, [subjectId]: { ...roadmap, criadoEm: new Date().toISOString() } } }));
        return id;
      },
      apagar: (subjectId) => {
        const boards = useBoards.getState();
        boards.boards.filter((b) => b.roadmapDe === subjectId).forEach((b) => boards.remove(b.id));
        set((s) => {
          const { [subjectId]: _fora, ...resto } = s.porMateria;
          return { porMateria: resto };
        });
      },
    }),
    { name: 'neural-os.roadmaps', version: 1 },
  ),
);
