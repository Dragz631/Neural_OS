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
interface NavState {
  tab: TabId;
  topicId?: Id;
  go: (tab: TabId, topicId?: Id) => void;
}

export const useNav = create<NavState>()((set) => ({
  tab: 'lobby',
  go: (tab, topicId) => set((s) => ({ tab, topicId: topicId ?? s.topicId })),
}));
