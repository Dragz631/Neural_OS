import { create } from 'zustand';
import type { Id } from '../domain/types';

export type TabId = 'lobby' | 'arvore' | 'professor' | 'sandbox' | 'horario' | 'lousa' | 'dungeon';

export const TABS: { id: TabId; label: string }[] = [
  { id: 'lobby', label: 'Lobby' },
  { id: 'arvore', label: 'Árvore' },
  { id: 'professor', label: 'Prof. A.Ilson' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'horario', label: 'Molda-Horário' },
  { id: 'lousa', label: 'Lousa' },
  { id: 'dungeon', label: 'Dungeon' },
];

// Navegação global: qualquer aba pode mandar abrir outra já num tópico
// (ex.: Lobby → "Iniciar sessão" abre o Professor no tópico do Target).
// Também leva código de uma aba pro Sandbox (Lousa, Dungeon, Professor).
export interface CodigoRecebido {
  texto: string;
  /** De onde veio, pra mostrar no desafio ("Lousa", "Dungeon"...). */
  origem: string;
  linguagem?: string;
}

interface NavState {
  tab: TabId;
  topicId?: Id;
  codigo?: CodigoRecebido;
  go: (tab: TabId, topicId?: Id) => void;
  mandarProSandbox: (codigo: CodigoRecebido, topicId?: Id) => void;
  /** O Sandbox pega o código uma vez (e ele sai da fila). */
  pegarCodigo: () => CodigoRecebido | undefined;
}

export const useNav = create<NavState>()((set, get) => ({
  tab: 'lobby',
  go: (tab, topicId) => set((s) => ({ tab, topicId: topicId ?? s.topicId })),
  mandarProSandbox: (codigo, topicId) => set((s) => ({ tab: 'sandbox', codigo, topicId: topicId ?? s.topicId })),
  pegarCodigo: () => {
    const c = get().codigo;
    if (c) set({ codigo: undefined });
    return c;
  },
}));
