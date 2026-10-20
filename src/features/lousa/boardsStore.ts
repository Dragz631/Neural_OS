import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newId } from '../../store/study';
import { idbDel } from '../../services/idb';
import type { MapaMateria } from '../../domain/mapa';

// Lista das lousas (só nome e metadados, leve). O desenho de cada uma fica no
// IndexedDB, na chave `lousa:<id>` (ver sceneStorage.ts).

export interface BoardMeta {
  id: string;
  name: string;
  topicId?: string;
  /** Mapa a desenhar quando a lousa for aberta pela 1ª vez (vem do "Nova matéria"). */
  mapa?: MapaMateria;
  elementCount: number;
  createdAt: string;
  updatedAt: string;
}

interface BoardsState {
  boards: BoardMeta[];
  activeId?: string;
  create: (name?: string, extra?: Pick<BoardMeta, 'topicId' | 'mapa'>) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  setActive: (id: string) => void;
  linkTopic: (id: string, topicId?: string) => void;
  touch: (id: string, elementCount: number) => void;
}

export const useBoards = create<BoardsState>()(
  persist(
    (set, get) => ({
      boards: [],
      create: (name, extra) => {
        const id = newId('lousa');
        const now = new Date().toISOString();
        const board: BoardMeta = { id, name: name?.trim() || `Lousa ${get().boards.length + 1}`, elementCount: 0, createdAt: now, updatedAt: now, ...extra };
        set((s) => ({ boards: [board, ...s.boards], activeId: id }));
        return id;
      },
      rename: (id, name) => set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, name } : b)) })),
      remove: (id) => {
        void idbDel(`lousa:${id}`);
        set((s) => {
          const boards = s.boards.filter((b) => b.id !== id);
          return { boards, activeId: s.activeId === id ? boards[0]?.id : s.activeId };
        });
      },
      setActive: (activeId) => set({ activeId }),
      linkTopic: (id, topicId) => set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, topicId } : b)) })),
      touch: (id, elementCount) =>
        set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, elementCount, updatedAt: new Date().toISOString() } : b)) })),
    }),
    { name: 'neural-os.lousas', version: 1 },
  ),
);
