import { create } from 'zustand';
import { persist } from '../../lib/persistir';
import { newId } from '../../store/study';
import { idbDel } from '../../services/idb';
import type { MapaMateria } from '../../domain/mapa';
import type { Roadmap } from '../../domain/roadmap';

// Lista das lousas (só nome e metadados, leve). O desenho de cada uma fica no
// IndexedDB, na chave `lousa:<id>` (ver sceneStorage.ts).

export interface BoardMeta {
  id: string;
  name: string;
  topicId?: string;
  /** Mapa a desenhar quando a lousa for aberta pela 1ª vez (vem do "Nova matéria"). */
  mapa?: MapaMateria;
  /** Roadmap a desenhar na primeira abertura (criado pelo professor). */
  roadmap?: Roadmap;
  /** Lousa do roadmap desta matéria (uma por matéria). */
  roadmapDe?: string;
  /** Grupo (pasta) escolhido pela pessoa. Sem isso, a lousa entra no grupo da matéria do tópico dela. */
  grupo?: string;
  /** Quadro do Prof. A.Ilson deste tópico (um por tópico; aparece também na Lousa). */
  quadroDe?: string;
  /** Quadro livre do aluno neste tópico (em branco, só dele). */
  livreDe?: string;
  /** Chaves das aulas já desenhadas aqui (aula nova é desenhada ao lado, uma vez só). */
  desenhados?: string[];
  elementCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Lousa do professor (aula, roadmap): vive só na aba Professor, nunca na lista da Lousa. */
export const ehDoProfessor = (b: BoardMeta): boolean => !!b.quadroDe || !!b.roadmapDe;

interface BoardsState {
  boards: BoardMeta[];
  /** Nomes dos grupos criados (existem mesmo vazios). */
  grupos: string[];
  activeId?: string;
  create: (name?: string, extra?: Pick<BoardMeta, 'topicId' | 'mapa' | 'roadmap' | 'roadmapDe' | 'grupo'>) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  setActive: (id: string) => void;
  criarGrupo: (nome: string) => void;
  renomearGrupo: (antigo: string, novo: string) => void;
  /** Apaga o grupo; as lousas dele ficam soltas (nada é apagado). */
  apagarGrupo: (nome: string) => void;
  moverParaGrupo: (id: string, grupo?: string) => void;
  linkTopic: (id: string, topicId?: string) => void;
  touch: (id: string, elementCount: number) => void;
  /** Acha ou cria o quadro do tópico SEM trocar a lousa ativa da aba Lousa. */
  quadroDoTopico: (topicId: string, nome: string) => string;
  marcarDesenhado: (id: string, chave: string) => void;
  /** Quadro em branco só do aluno, ao lado do quadro do professor (sem desenho da IA). */
  quadroLivreDoTopico: (topicId: string, nome: string) => string;
}

export const useBoards = create<BoardsState>()(
  persist(
    (set, get) => ({
      boards: [],
      grupos: [],
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
      criarGrupo: (nome) => {
        const n = nome.trim();
        if (n) set((s) => (s.grupos.includes(n) ? s : { grupos: [...s.grupos, n] }));
      },
      renomearGrupo: (antigo, novo) => {
        const n = novo.trim();
        if (!n || n === antigo) return;
        set((s) => ({
          grupos: s.grupos.includes(n) ? s.grupos.filter((g) => g !== antigo) : s.grupos.map((g) => (g === antigo ? n : g)),
          boards: s.boards.map((b) => (b.grupo === antigo ? { ...b, grupo: n } : b)),
        }));
      },
      apagarGrupo: (nome) => set((s) => ({ grupos: s.grupos.filter((g) => g !== nome), boards: s.boards.map((b) => (b.grupo === nome ? { ...b, grupo: undefined } : b)) })),
      moverParaGrupo: (id, grupo) => set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, grupo: grupo || undefined } : b)) })),
      linkTopic: (id, topicId) => set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, topicId } : b)) })),
      quadroDoTopico: (topicId, nome) => {
        const existente = get().boards.find((b) => b.quadroDe === topicId);
        if (existente) return existente.id;
        const id = newId('lousa');
        const now = new Date().toISOString();
        set((s) => ({ boards: [...s.boards, { id, name: `Quadro: ${nome}`, topicId, quadroDe: topicId, elementCount: 0, createdAt: now, updatedAt: now }] }));
        return id;
      },
      quadroLivreDoTopico: (topicId, nome) => {
        const existente = get().boards.find((b) => b.livreDe === topicId);
        if (existente) return existente.id;
        const id = newId('lousa');
        const now = new Date().toISOString();
        set((s) => ({ boards: [...s.boards, { id, name: `Livre: ${nome}`, topicId, livreDe: topicId, elementCount: 0, createdAt: now, updatedAt: now }] }));
        return id;
      },
      marcarDesenhado: (id, chave) =>
        set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, desenhados: [...(b.desenhados ?? []), chave] } : b)) })),
      touch: (id, elementCount) =>
        set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, elementCount, updatedAt: new Date().toISOString() } : b)) })),
    }),
    { name: 'neural-os.lousas', version: 1 },
  ),
);
